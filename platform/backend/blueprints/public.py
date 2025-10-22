from flask import Blueprint, request, jsonify, send_file, current_app, g, make_response
from datetime import datetime, time, timezone, timedelta
import os
import csv
from io import StringIO
import json
from collections import defaultdict
import uuid

from utils.file import clean_name

from mongoengine import DoesNotExist, ValidationError
from mongoengine.queryset.visitor import Q
from models import Municipio, Ata, Topico, Participante, Assunto, Query
from bson import ObjectId

# search logs
from logger import setup_logger
search_logger = setup_logger(name="search")
endpoint_logger = setup_logger(name="endpoint")

public_bp = Blueprint('public', __name__)
API_URL = current_app.config["API_URL"] if current_app else "http://localhost:5059"

@public_bp.before_request
def setup_request():
    # --- logging ---
    g.start_time = datetime.now()
    g.request_id = str(uuid.uuid4())
    
    cookie_consent = request.cookies.get('cookieConsent')
    
    if cookie_consent == 'full':
        log_data = {
            "request_id": g.request_id,
            "timestamp": g.start_time.isoformat(),
            "ip": request.remote_addr,
            "endpoint": request.path,
            "method": request.method,
            "args": request.args.to_dict(),
            "form": request.form.to_dict(),
            "json": request.get_json(silent=True),
            "user_agent": request.headers.get("User-Agent"),
            "consent": "full"
        }
    else:
        log_data = {
            "request_id": g.request_id,
            "timestamp": g.start_time.isoformat(),
            "endpoint": request.path,
            "method": request.method,
            "consent": cookie_consent or "none"
        }
    
    g.request_log_data = log_data
    endpoint_logger.info(f"[REQUEST] {json.dumps(log_data)}")

    # --- dynamic database selection, given the demo argument ---
    g.db_alias = "default" if request.args.get("demo") == "1" else "demo"
    g.lang = "en" if request.args.get("lang", "").lower() == "en" else "pt"

@public_bp.after_request
def log_response_info(response):
    duration = (datetime.utcnow() - g.start_time).total_seconds() * 1000  # in ms

    log_data = getattr(g, 'request_log_data', {})
    log_data.update({
        "status": response.status_code,
        "duration_ms": int(duration),
        "response_length": response.calculate_content_length(),
    })

    # Always log response (personal data already filtered in before_request)
    endpoint_logger.info(f"[RESPONSE] {json.dumps(log_data)}")
    
    # Only send error alerts if we have IP info (full consent)
    # if log_data["status"] >= 500 and "ip" in log_data:
    #     send_telegram_message(
    #         text=f"[{g.request_id}] [ERROR] ip={log_data['ip']} | endpoint={log_data['endpoint']} | status={log_data['status']} | duration={log_data['duration_ms']}ms"
    #     )

    response.headers["X-Request-ID"] = g.request_id

    return response


@public_bp.teardown_request
def log_exception_if_any(error):
    if error:
        request_id = getattr(g, "request_id", "unknown")
        endpoint_logger.error(
            f"[EXCEPTION] [{request_id}] {request.path} | {error}",
            exc_info=True
        )

@public_bp.route("/search/suggestions", methods=["GET"])
def get_search_suggestions():
    """Get search suggestions based on partial query
    ---
    tags:
      - Public
      - Search
    description: Returns autocomplete suggestions based on popular search queries.
    parameters:
      - in: query
        name: q
        required: true
        schema:
          type: string
        description: Partial query string
      - in: query
        name: limit
        schema:
          type: integer
          default: 10
        description: Maximum number of suggestions to return
    responses:
      200:
        description: List of search suggestions
        content:
          application/json:
            schema:
              type: object
              properties:
                suggestions:
                  type: array
                  items:
                    type: object
                    properties:
                      text:
                        type: string
                      type:
                        type: string
                      count:
                        type: integer
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    try:
        q = request.args.get("q", "").strip()
        limit = int(request.args.get("limit", 10))

        if not q:
            return jsonify({"suggestions": []}), 200

        q_norm = q.strip().lower()
        suggestions = []
        query_objs = Query.objects(query__icontains=q_norm).order_by('-count')[:limit]

        for sq in query_objs:
            if sq.query and len(sq.query.strip()) > 0:
                suggestions.append({
                    "text": sq.query,
                    "type": "title",
                    "count": int(sq.count or 0)
                })

        return jsonify({"suggestions": suggestions}), 200
    except Exception as e:
        search_logger.error(f"Error fetching search suggestions: {str(e)}")
        return jsonify({"error": "Internal error fetching suggestions"}), 500


@public_bp.route("/atas/search", methods=["GET"])
def search_atas():
    """Search for municipal meeting minutes with advanced filters
    ---
    tags:
      - Public
      - Meeting Minutes
      - Search
    description: Search municipal meeting minutes using keyword, filters, and advanced logic. Returns paginated results, facets, and autocomplete suggestions.
    parameters:
      - in: query
        name: q
        schema:
          type: string
        description: Keyword for full-text search
      - in: query
        name: title
        schema:
          type: string
        description: Filter by title
      - in: query
        name: content
        schema:
          type: string
        description: Filter by content
      - in: query
        name: municipio_id
        schema:
          type: string
        description: City council ID or slug
      - in: query
        name: tipo
        schema:
          type: string
        description: Type of municipal meeting minute
      - in: query
        name: participant_id
        schema:
          type: array
          items:
            type: string
        description: Filter by participant IDs (comma-separated or repeated)
      - in: query
        name: participants_logic
        schema:
          type: string
          enum: [and, or]
          default: or
        description: Logic for participant filter (AND/OR)
      - in: query
        name: party
        schema:
          type: string
        description: Filter by party
      - in: query
        name: topico
        schema:
          type: array
          items:
            type: string
        description: Filter by topic IDs or slugs
      - in: query
        name: topicos_logic
        schema:
          type: string
          enum: [and, or]
          default: or
        description: Logic for topic filter (AND/OR)
      - in: query
        name: start_date
        schema:
          type: string
          format: date
        description: Start date (YYYY-MM-DD)
      - in: query
        name: end_date
        schema:
          type: string
          format: date
        description: End date (YYYY-MM-DD)
      - in: query
        name: page
        schema:
          type: integer
          default: 1
        description: Page number
      - in: query
        name: per_page
        schema:
          type: integer
          default: 12
        description: Results per page
      - in: query
        name: sort
        schema:
          type: string
          default: date
        description: Sort field
      - in: query
        name: order
        schema:
          type: string
          enum: [asc, desc]
          default: desc
        description: Sort order
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
      - in: query
        name: lang
        schema:
          type: string
          enum: [pt, en]
          default: pt
        description: Language for localized content
    responses:
      200:
        description: Search results with pagination, facets, and autocomplete
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    type: object
                pagination:
                  type: object
                applied_filters:
                  type: object
                facets:
                  type: object
                autocomplete_suggestions:
                  type: array
                  items:
                    type: string
                search_info:
                  type: object
      400:
        description: Invalid request or filter
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    ip_address = request.remote_addr

    search_logger.info(f"ip={ip_address} | auid={anon_user_id} | method=/atas/search")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        base_query = {}
        highlights_by_id = {}
        facets = {}

        keyword = request.args.get("q", "").strip()
        title = request.args.get("title", "").strip()
        content = request.args.get("content", "").strip()
        lang = request.args.get("lang", "pt").strip().lower()  # Default to Portuguese

        search_logger.info(f"/atas/search called, query={keyword}, lang={lang}")
        topicos = []
        for topic_param in request.args.getlist("topico"):
            if ',' in topic_param:
                topicos.extend([t.strip() for t in topic_param.split(',') if t.strip()])
            elif topic_param.strip():
                topicos.append(topic_param.strip())

        municipio_id = request.args.get("municipio_id", "").strip()
        tipo = request.args.get("tipo", "").strip()
        
        participant_ids = []
        for participant_param in request.args.getlist("participant_id"):
            if ',' in participant_param:
                participant_ids.extend([p.strip() for p in participant_param.split(',') if p.strip()])
            elif participant_param.strip():
                participant_ids.append(participant_param.strip())
        
        participants_logic = request.args.get("participants_logic", "or").lower()  # "and" or "or"
        topicos_logic = request.args.get("topicos_logic", "or").lower()  # "and" or "or"
                
        party = request.args.get("party", "").strip()
        start_date = request.args.get("start_date", "").strip()
        end_date = request.args.get("end_date", "").strip()

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 12, type=int)
        sort_by = request.args.get("sort", "date")
        sort_order = request.args.get("order", "desc")

        ata_ids = []
        used_fallback = False
        
        # keyword search is done with atlas search index (mongo atlas)
        if keyword:

            # saving the query keyword on the database
            Query.objects(query=keyword).using(db_alias).update_one(
                set__last_seen=datetime.now(),
                inc__count=1,
                set_on_insert__first_seen=datetime.now(),
                upsert=True
            )

            atas_collection = Ata.objects.using(db_alias)
            final_ata_ids = []
            search_method_used = "none"
            
            # Create separate pipelines for Portuguese and English search
            if lang == "en":
                # English pipeline - focus on English fields
                exact_search_pipeline = [
                    {
                        "$search": {
                            "index": "atas_search_en",
                            "compound": {
                                "must": [
                                    {
                                        "compound": {
                                            "should": [
                                                # Phrase matches - English fields prioritized
                                                {
                                                    "phrase": {
                                                        "query": keyword,
                                                        "path": ["title_en", "summary_en", "content_en"],
                                                        "slop": 0,
                                                        "score": { "boost": { "value": 80 } }
                                                    }
                                                },
                                                # Title matches - English first
                                                {
                                                    "text": {
                                                        "query": keyword,
                                                        "path": ["title_en"],
                                                        "score": { "boost": { "value": 20 } },
                                                        "matchCriteria": "all"
                                                    }
                                                },
                                                # Summary matches - English first
                                                {
                                                    "text": {
                                                        "query": keyword,
                                                        "path": ["summary_en"],
                                                        "score": { "boost": { "value": 18 } },
                                                        "matchCriteria": "all"
                                                    }
                                                },
                                                # Location matches (language neutral)
                                                {
                                                    "text": {
                                                        "query": keyword,
                                                        "path": "location",
                                                        "score": { "boost": { "value": 5 } },
                                                        "matchCriteria": "all"
                                                    }
                                                }
                                            ],
                                            "minimumShouldMatch": 1
                                        }
                                    }
                                ],
                                "should": [
                                    # Content matches - English prioritized
                                    {
                                        "text": {
                                            "query": keyword,
                                            "path": "content_en",
                                            "score": { "boost": { "value": 0.40 } },
                                            "matchCriteria": "all"
                                        }
                                    }
                                ]
                            },
                            "highlight": {
                                "path": ["title_en", "summary_en", "content_en", "location"]
                            }
                        }
                    },
                    {
                        "$project": {
                            "_id": 1,
                            "score": { "$meta": "searchScore" },
                            "highlights": { "$meta": "searchHighlights" }
                        }
                    },
                    { "$sort": { "score": -1 } }
                ]
            else:
                # Portuguese pipeline (default) - focus on Portuguese fields
                exact_search_pipeline = [
                    {
                        "$search": {
                            "index": "atas_search",
                            "compound": {
                                "must": [
                                    {
                                        "compound": {
                                            "should": [
                                                # Phrase matches - Portuguese fields prioritized
                                                {
                                                    "phrase": {
                                                        "query": keyword,
                                                        "path": ["title", "summary", "content"],
                                                        "slop": 0,
                                                        "score": { "boost": { "value": 70 } }
                                                    }
                                                },
                                                # Title matches - Portuguese first
                                                {
                                                    "text": {
                                                        "query": keyword,
                                                        "path": ["title"],
                                                        "score": { "boost": { "value": 18 } },
                                                        "matchCriteria": "all"
                                                    }
                                                },
                                                # Summary matches - Portuguese first
                                                {
                                                    "text": {
                                                        "query": keyword,
                                                        "path": ["summary"],
                                                        "score": { "boost": { "value": 16 } },
                                                        "matchCriteria": "all"
                                                    }
                                                },
                                                # Location matches (language neutral)
                                                {
                                                    "text": {
                                                        "query": keyword,
                                                        "path": "location",
                                                        "score": { "boost": { "value": 5 } },
                                                        "matchCriteria": "all"
                                                    }
                                                }
                                            ],
                                            "minimumShouldMatch": 1
                                        }
                                    }
                                ],
                                "should": [
                                    # Content matches - Portuguese prioritized
                                    {
                                        "text": {
                                            "query": keyword,
                                            "path": "content",
                                            "score": { "boost": { "value": 0.35 } },
                                            "matchCriteria": "all"
                                        }
                                    }
                                ]
                            },
                            "highlight": {
                                "path": ["title", "summary", "content", "location"]
                            }
                        }
                    },
                    {
                        "$project": {
                            "_id": 1,
                            "score": { "$meta": "searchScore" },
                            "highlights": { "$meta": "searchHighlights" }
                        }
                    },
                    { "$sort": { "score": -1 } }
                ]

            try:
                # Execute all three searches
                exact_results = []
                portuguese_results = []
                custom_results = []

                # Stage 1: Exact search
                try:
                    exact_results = list(atas_collection.aggregate(exact_search_pipeline))
                    search_logger.info(f"Exact search found {len(exact_results)} results for keyword '{keyword}'")
                except Exception as exact_error:
                    search_logger.error(f"Exact search error: {exact_error}")

                # Merge and score results
                scored_results = {}
                
                # Process exact results (highest priority - score × 3)
                for result in exact_results:
                    ata_id = result["_id"]
                    scored_results[ata_id] = {
                        "id": ata_id,
                        "score": result["score"] * 3,
                        "highlights": result.get("highlights", []),
                        "search_type": "exact"
                    }


                # Sort by final score and extract data
                sorted_results = sorted(scored_results.values(), key=lambda x: x["score"], reverse=True)
                final_ata_ids = [result["id"] for result in sorted_results]
                
                # Process highlights
                for result in sorted_results:
                    if result["highlights"]:
                        # Determine language match based on highlight paths
                        lang_match = "pt"  # default to Portuguese
                        for highlight in result["highlights"]:
                            highlight_path = highlight.get("path", "")
                            if highlight_path.endswith("_en"):
                                lang_match = "en"
                                break  # If any field is English, mark as English match
                        
                        highlights_by_id[result["id"]] = {
                            "highlights": result["highlights"],
                            "lang_match": lang_match
                        }

                if len(exact_results) > 0:
                    search_method_used = "exact_primary"
                else:
                    search_method_used = "no_results"

                # Generate autocomplete suggestions if results are weak
                autocomplete_suggestions = []
                if len(final_ata_ids) < 3:
                    # search_logger.info(f"Weak results ({len(final_ata_ids)}) for keyword '{keyword}', generating autocomplete suggestions")
                    
                    # Use your existing autocomplete pipeline
                    autocomplete_pipeline = [
                        {
                            "$search": {
                                "index": "atas_autocomplete",
                                "compound": {
                                    "should": [
                                        {
                                            "autocomplete": {
                                                "query": keyword,
                                                "path": "title",
                                                "score": {"boost": {"value": 3}}
                                            }
                                        },
                                        {
                                            "autocomplete": {
                                                "query": keyword,
                                                "path": "summary",
                                                "score": {"boost": {"value": 2}}
                                            }
                                        },
                                        {
                                            "autocomplete": {
                                                "query": keyword,
                                                "path": "content"
                                            }
                                        },
                                        {
                                            "autocomplete": {
                                                "query": keyword,
                                                "path": "location",
                                                "score": {"boost": {"value": 1.5}}
                                            }
                                        }
                                    ],
                                    "minimumShouldMatch": 1
                                },
                                "highlight": {
                                    "path": ["title", "summary", "location"]
                                }
                            }
                        },
                        {
                            "$project": {
                                "_id": 1,
                                "title": 1,
                                "summary": 1,
                                "content": 1,
                                "location": 1,
                                "score": {"$meta": "searchScore"},
                                "highlights": {"$meta": "searchHighlights"}
                            }
                        },
                        {"$sort": {"score": -1}},
                        {"$limit": 5}
                    ]
                    
                    try:
                        autocomplete_results = list(atas_collection.aggregate(autocomplete_pipeline))
                        
                        suggestion_terms = set()
                        for result in autocomplete_results:
                            if "highlights" in result:
                                for highlight in result["highlights"]:
                                    for text in highlight.get("texts", []):
                                        if text.get("type") == "hit":
                                            term = text.get("value", "").strip()
                                            if term and len(term) > 2: 
                                                suggestion_terms.add(term.lower())
                                
                            if not result.get("highlights"):
                                for field in ["title", "summary", "content", "location"]:
                                    if field in result and result[field]:
                                        words = result[field].lower().split()
                                        for word in words:
                                            if len(word) > 3 and keyword.lower() in word:
                                                suggestion_terms.add(word)
                        
                        autocomplete_suggestions = list(suggestion_terms)[:5]
                        
                    except Exception as autocomplete_error:
                        search_logger.error(f"Autocomplete generation error: {autocomplete_error}")
                        autocomplete_suggestions = []

                if final_ata_ids:
                    base_query["id__in"] = final_ata_ids
                    search_logger.info(f"Multi-stage search found {len(final_ata_ids)} results using {search_method_used} for keyword '{keyword}'")
                else:
                    # Fallback to regex prefix search when Atlas Search returns nothing
                    search_logger.info(f"No atas found via Atlas Search for '{keyword}', attempting regex prefix fallback")
                
                    if len(keyword) >= 1:
                        try:
                            # regex with word boundary for prefix matching (optimized)
                            regex_pattern = f"\\b{keyword}"  # \b = word boundary, makes regex more efficient
                            
                            # Build regex fallback query based on language
                            if lang == "en":
                                fallback_raw_query = {
                                    "$or": [
                                        {"title_en": {"$regex": regex_pattern, "$options": "i"}},
                                        {"summary_en": {"$regex": regex_pattern, "$options": "i"}},
                                        {"location": {"$regex": regex_pattern, "$options": "i"}}
                                    ]
                                }
                            else:
                                fallback_raw_query = {
                                    "$or": [
                                        {"title": {"$regex": regex_pattern, "$options": "i"}},
                                        {"summary": {"$regex": regex_pattern, "$options": "i"}},
                                        {"location": {"$regex": regex_pattern, "$options": "i"}}
                                    ]
                                }
                            
                            # Execute the query with limit
                            fallback_atas = Ata.objects(__raw__=fallback_raw_query).using(db_alias).only('id').limit(100)
                            final_ata_ids = [ata.id for ata in fallback_atas]
                            
                            if final_ata_ids:
                                base_query["id__in"] = final_ata_ids
                                used_fallback = True
                                search_method_used = "regex_prefix_fallback"
                                search_logger.info(f"Regex prefix fallback found {len(final_ata_ids)} results for keyword '{keyword}'")
                            else:
                                search_logger.info(f"No results found even with regex prefix fallback for '{keyword}'")
                                return jsonify({
                                    "data": [],
                                    "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                                    "applied_filters": {
                                        "keyword": keyword, "title": title, "content": content, "tipo": tipo,
                                        "municipio_id": municipio_id, "participant_id": participant_ids, "party": party,
                                        "topico": topicos, "start_date": start_date, "end_date": end_date,
                                        "sort_by": sort_by, "sort_order": sort_order
                                    },
                                    "facets": {},
                                    "autocomplete_suggestions": autocomplete_suggestions,
                                    "search_info": {
                                        "used_fallback": True, 
                                        "search_method": "regex_prefix_fallback_no_results",
                                        "total_found": 0
                                    }
                                }), 200
                        except Exception as fallback_error:
                            search_logger.error(f"Regex prefix fallback error: {fallback_error}")
                            return jsonify({
                                "data": [],
                                "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                                "applied_filters": {
                                    "keyword": keyword, "title": title, "content": content, "tipo": tipo,
                                    "municipio_id": municipio_id, "participant_id": participant_ids, "party": party,
                                    "topico": topicos, "start_date": start_date, "end_date": end_date,
                                    "sort_by": sort_by, "sort_order": sort_order
                                },
                                "facets": {},
                                "autocomplete_suggestions": autocomplete_suggestions,
                                "search_info": {
                                    "used_fallback": False, 
                                    "search_method": "fallback_error",
                                    "total_found": 0
                                }
                            }), 200
                    else:
                        search_logger.info(f"Keyword '{keyword}' too short for regex prefix fallback (length: {len(keyword)})")
                        return jsonify({
                            "data": [],
                            "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                            "applied_filters": {
                                "keyword": keyword, "title": title, "content": content, "tipo": tipo,
                                "municipio_id": municipio_id, "participant_id": participant_ids, "party": party,
                                "topico": topicos, "start_date": start_date, "end_date": end_date,
                                "sort_by": sort_by, "sort_order": sort_order
                            },
                            "facets": {},
                            "autocomplete_suggestions": autocomplete_suggestions,
                            "search_info": {
                                "used_fallback": False, 
                                "search_method": "query_too_short",
                                "total_found": 0
                            }
                        }), 200

            except Exception as search_error:
                search_logger.error(f"Multi-stage search error: {search_error}")
                autocomplete_suggestions = []
                search_method_used = "error"

            search_method = search_method_used if final_ata_ids else "no_keyword"


        # if title:
        #     base_query["title__icontains"] = title
        # if content:
        #     base_query["content__icontains"] = content
        if municipio_id:
            if ObjectId.is_valid(municipio_id):
                base_query["municipio"] = ObjectId(municipio_id)
            else:
                try:
                    municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)
                    base_query["municipio"] = str(municipio.id)
                except (DoesNotExist, ValidationError):
                    return jsonify({"error": "Invalid or non-existent municipio_id"}), 404

        if tipo:
            base_query["tipo"] = tipo.lower()

        # multiple participants
        if participant_ids:
            try:
                if participants_logic == "and":
                    intersection_ata_ids = None
                    
                    for participant_id in participant_ids:
                        if not participant_id.strip():
                            continue  # skip empty participants
                        
                        try:
                            participant_id_to_use = ObjectId(participant_id) if ObjectId.is_valid(participant_id) else participant_id
                            participant_atas = Ata.objects(participantes__in=[participant_id_to_use]).using(db_alias).only('id')
                            participant_ata_ids = set(ata.id for ata in participant_atas)
                        except Exception as e:
                            search_logger.warning(f"Error processing participant_id {participant_id}: {str(e)}")
                            continue
                            
                        if not participant_ata_ids:
                            intersection_ata_ids = set()
                            break
                            
                        if intersection_ata_ids is None:
                            intersection_ata_ids = participant_ata_ids
                        else:
                            intersection_ata_ids = intersection_ata_ids.intersection(participant_ata_ids)
                            
                        if not intersection_ata_ids:
                            break
                    
                    if intersection_ata_ids:
                        if "id__in" in base_query:
                            existing_ids = set(base_query["id__in"])
                            filtered_ids = existing_ids.intersection(intersection_ata_ids)
                            if not filtered_ids:
                                return jsonify({
                                    "data": [],
                                    "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                                    "applied_filters": {
                                        "keyword": keyword, "title": title, "content": content,
                                        "tipo": tipo, "municipio_id": municipio_id, 
                                        "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,
                                        "topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,
                                        "end_date": end_date, "sort_by": sort_by, "sort_order": sort_order
                                    },
                                    "facets": {},
                                    "autocomplete_suggestions": autocomplete_suggestions if keyword else [],
                                    "search_info": {"used_fallback": used_fallback, "total_found": 0}
                                    
                                }), 200
                            base_query["id__in"] = list(filtered_ids)
                        else:
                            base_query["id__in"] = list(intersection_ata_ids)
                    else:
                        return jsonify({
                            "data": [],
                            "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                            "applied_filters": {
                                "keyword": keyword, "title": title, "content": content,
                                "tipo": tipo, "municipio_id": municipio_id, 
                                "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,
                                "topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,
                                "end_date": end_date, "sort_by": sort_by, "sort_order": sort_order
                            },
                            "facets": {},
                            "autocomplete_suggestions": autocomplete_suggestions if keyword else [],
                            "search_info": {"used_fallback": used_fallback, "total_found": 0}
                        }), 200
                else:
                    # OR logic: find atas that have ANY of the specified participants (original logic)
                    all_participant_ata_ids = set()
                    first_participant = True
                    
                    for participant_id in participant_ids:
                        if not participant_id.strip():
                            continue  # Skip empty participant IDs
                        
                        try:
                            participant_id_to_use = ObjectId(participant_id) if ObjectId.is_valid(participant_id) else participant_id
                            participant_atas = Ata.objects(participantes__in=[participant_id_to_use]).using(db_alias).only('id')
                            participant_ata_ids = set(ata.id for ata in participant_atas)
                        except Exception as e:
                            search_logger.warning(f"Error processing participant_id {participant_id}: {str(e)}")
                            continue
                            
                        if not participant_ata_ids:
                            continue  # Skip participants with no atas
                            
                        if first_participant:
                            all_participant_ata_ids = participant_ata_ids
                            first_participant = False
                        else:
                            all_participant_ata_ids.update(participant_ata_ids)
                    
                    if all_participant_ata_ids:
                        if "id__in" in base_query:
                            existing_ids = set(base_query["id__in"])
                            filtered_ids = existing_ids.intersection(all_participant_ata_ids)
                            if not filtered_ids:
                                return jsonify({
                                    "data": [],
                                    "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                                    "applied_filters": {
                                        "keyword": keyword, "title": title, "content": content,
                                        "tipo": tipo, "municipio_id": municipio_id, 
                                        "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,
                                        "topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,
                                        "end_date": end_date, "sort_by": sort_by, "sort_order": sort_order
                                    },
                                    "facets": {},
                                    "autocomplete_suggestions": autocomplete_suggestions if keyword else [],
                                    "search_info": {"used_fallback": used_fallback, "total_found": 0}
                                }), 200
                            base_query["id__in"] = list(filtered_ids)
                        else:
                            base_query["id__in"] = list(all_participant_ata_ids)
                    else:
                        return jsonify({
                            "data": [],
                            "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                            "applied_filters": {
                                "keyword": keyword, "title": title, "content": content,
                                "tipo": tipo, "municipio_id": municipio_id, 
                                "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,
                                "topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,
                                "end_date": end_date, "sort_by": sort_by, "sort_order": sort_order
                            },
                            "facets": {},
                            "autocomplete_suggestions": autocomplete_suggestions if keyword else [],
                            "search_info": {"used_fallback": used_fallback, "total_found": 0}
                        }), 200
            except Exception as e:
                search_logger.error(f"Error processing participant filters: {str(e)}")
                return jsonify({"error": f"Invalid or non-existent participant_id: {str(e)}"}), 400

        if party:
            try:
                party_participants = Participante.objects(mandatos__match={'party__iexact': party}).using(db_alias).only('id')
                if not party_participants:
                    return jsonify({
                        "data": [], 
                        "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}, 
                        "applied_filters": {
                            "keyword": keyword, "title": title, "content": content,
                            "tipo": tipo, "municipio_id": municipio_id, 
                            "participant_id": participant_ids, "party": party,
                            "topico": topicos, "start_date": start_date,
                            "end_date": end_date, "sort_by": sort_by, "sort_order": sort_order
                        },
                        "facets": {},
                        "autocomplete_suggestions": autocomplete_suggestions if keyword else []
                    }), 200
                
                participant_ids_list = [participant.id for participant in party_participants]
                party_atas = Ata.objects(participantes__in=participant_ids_list).using(db_alias).only('id')
                party_ata_ids = [ata.id for ata in party_atas]
                
                if party_ata_ids:
                    if "id__in" in base_query:
                        base_query["id__in"] = [id for id in base_query["id__in"] if id in party_ata_ids]
                        if not base_query["id__in"]:
                            return jsonify({
                                "data": [], 
                                "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}, 
                                "applied_filters": {
                                    "keyword": keyword, "title": title, "content": content,
                                    "tipo": tipo, "municipio_id": municipio_id, 
                                    "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,
                                    "topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,
                                    "end_date": end_date, "sort_by": sort_by, "sort_order": sort_order
                                },
                                "facets": {},
                                "autocomplete_suggestions": autocomplete_suggestions if keyword else []
                            }), 200
                    else:
                        base_query["id__in"] = party_ata_ids
                else:
                    return jsonify({
                        "data": [], 
                        "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}, 
                        "applied_filters": {"keyword": keyword, "title": title, "content": content,"tipo": tipo, "municipio_id": municipio_id, "participant_id": participant_ids, "party": party,"topico": topicos, "start_date": start_date,"end_date": end_date, "sort_by": sort_by, "sort_order": sort_order},
                        "facets": {},
                        "autocomplete_suggestions": autocomplete_suggestions if keyword else []
                    }), 200
            except Exception as e:
                search_logger.error(f"Party filter error: {str(e)}")
                return jsonify({"error": f"Error processing party filter: {str(e)}"}), 400
            
        # Handle multiple topicos
        if topicos:
            try:
                search_logger.info(f"Processing topicos filter with values: {topicos} using {topicos_logic.upper()} logic")
                topico_ids = []
                for topico in topicos:
                    if not topico.strip():
                        continue
                    search_logger.debug(f"Processing topico: {topico}")
                    if ObjectId.is_valid(topico):
                        topico_ids.append(ObjectId(topico))
                        search_logger.debug(f"Added ObjectId for topico: {topico}")
                    else:
                        topico_obj = Topico.objects(slug=topico).only('id').using(db_alias).first()
                        if topico_obj:
                            topico_ids.append(topico_obj.id)
                            search_logger.debug(f"Found topico by slug: {topico} -> {topico_obj.id}")
                        else:
                            search_logger.warning(f"Invalid topico (not found): {topico}")
                if not topico_ids:
                    search_logger.warning("No valid topico IDs found")
                    return jsonify({
                        "data": [],
                        "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                        "applied_filters": {"keyword": keyword, "title": title, "content": content,"tipo": tipo, "municipio_id": municipio_id, "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,"topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,"end_date": end_date, "sort_by": sort_by, "sort_order": sort_order},
                        "facets": {},
                        "autocomplete_suggestions": autocomplete_suggestions if keyword else []
                    }), 200
                
                assunto_collection = Assunto.objects.using(db_alias)
                
                if topicos_logic == "and":
                    intersection_ata_ids = None
                    
                    for topico_id in topico_ids:
                        pipeline = [
                            {"$match": {"topico": topico_id}},
                            {"$group": {"_id": "$ata"}},
                            {"$project": {"ata_id": "$_id"}}
                        ]
                        aggregation_results = list(assunto_collection.aggregate(pipeline))
                        topic_ata_ids = set(ObjectId(result["ata_id"]) for result in aggregation_results)
                        
                        if not topic_ata_ids:
                            # If any topic has no atas, result should be empty for AND logic
                            intersection_ata_ids = set()
                            break
                            
                        if intersection_ata_ids is None:
                            intersection_ata_ids = topic_ata_ids
                        else:
                            intersection_ata_ids = intersection_ata_ids.intersection(topic_ata_ids)
                            
                        # Early exit if intersection becomes empty
                        if not intersection_ata_ids:
                            break
                    
                    ata_ids = list(intersection_ata_ids) if intersection_ata_ids else []
                else:
                    # OR logic: find atas that have assuntos for ANY of the specified topics (original logic)
                    pipeline = [
                        {"$match": {"topico": {"$in": topico_ids}}},
                        {"$group": {"_id": "$ata"}},
                        {"$project": {"ata_id": "$_id"}}
                    ]
                    aggregation_results = list(assunto_collection.aggregate(pipeline))
                    ata_ids = [ObjectId(result["ata_id"]) for result in aggregation_results]
                
                if not ata_ids:
                    search_logger.info(f"No atas found with the specified topicos using {topicos_logic.upper()} logic")
                    return jsonify({"data": [],"pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},"applied_filters": {"keyword": keyword, "title": title, "content": content,"tipo": tipo, "municipio_id": municipio_id, "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,"topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,"end_date": end_date, "sort_by": sort_by, "sort_order": sort_order}, "facets": {},  "autocomplete_suggestions": autocomplete_suggestions if keyword else []
                    }), 200
                search_logger.info(f"Found {len(ata_ids)} atas with assuntos that have the specified topicos using {topicos_logic.upper()} logic")
                if "id__in" in base_query:
                    existing_ids = set(base_query["id__in"])
                    filtered_ids = [id for id in ata_ids if id in existing_ids]
                    if not filtered_ids:
                        search_logger.info("No atas match the topicos filter after applying other filters")
                        return jsonify({"data": [],"pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},"applied_filters": {"keyword": keyword, "title": title, "content": content,"tipo": tipo, "municipio_id": municipio_id, "participant_id": participant_ids, "participants_logic": participants_logic, "party": party,"topico": topicos, "topicos_logic": topicos_logic, "start_date": start_date,"end_date": end_date, "sort_by": sort_by, "sort_order": sort_order}, "facets": {},  "autocomplete_suggestions": autocomplete_suggestions if keyword else []
                        }), 200
                    base_query["id__in"] = filtered_ids
                else:
                    base_query["id__in"] = ata_ids
            except Exception as e:
                search_logger.error(f"Topico filter error: {str(e)}")
                search_logger.exception("Detailed topico filter error:")
                return jsonify({"error": f"Error processing topico filter: {str(e)}"}), 400
        
        search_method = "fallback" if used_fallback else "primary" if keyword else "no_keyword"
        search_logger.info(
            f"ip={ip_address} | auid={anon_user_id} | method=/atas/search | query={keyword} | search_method={search_method} | total_found={len(ata_ids) if ata_ids else 0}"
        )


        # **main query**
        base_query["status"] = "done"
        # base_query["human_validated"] = True
        query = Ata.objects(**base_query).using(db_alias)

        # date filters
        start_datetime = None
        end_datetime = None

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                start_datetime = datetime.combine(start_date_obj, time.min, tzinfo=timezone.utc)
                query = query.filter(date__gte=start_datetime)
            except ValueError:
                return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                end_datetime = datetime.combine(end_date_obj, time.min, tzinfo=timezone.utc)
                query = query.filter(date__lt=end_datetime)
            except ValueError:
                return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400

        facet_ids = []
        if base_query:
            temp_query = Ata.objects(**base_query).using(db_alias)
            if start_datetime:
                temp_query = temp_query.filter(date__gte=start_datetime)
            if end_datetime:
                temp_query = temp_query.filter(date__lt=end_datetime)
            facet_ids = [ata.id for ata in temp_query.only('id')]
        else:
            temp_query = Ata.objects().using(db_alias)
            if start_datetime:
                temp_query = temp_query.filter(date__gte=start_datetime)
            if end_datetime:
                temp_query = temp_query.filter(date__lt=end_datetime)
            facet_ids = [ata.id for ata in temp_query.only('id')]

        if facet_ids:
            atas_collection = Ata.objects.using(db_alias)
            
            # 1st facet pipeline - everything except **topics and parties**
            main_facet_pipeline = [
                {"$match": {"_id": {"$in": facet_ids}}},
                {"$facet": {
                    "years": [
                        {"$addFields": {"year": {"$year": "$date"}}},
                        {"$group": {"_id": "$year", "count": {"$sum": 1}}},
                        {"$sort": {"_id": -1}}
                    ],
                    "tipos": [
                        {"$group": {"_id": "$tipo", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ],
                    "municipios": [
                        {"$group": {"_id": "$municipio", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ],
                    "participants": [
                        {"$unwind": "$participantes"},
                        {"$group": {"_id": "$participantes", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ]
                }}
            ]
            
            # 2nd facet pipeline - topics (counting the unique atas per topic)
            topics_facet_pipeline = [
                {"$match": {"_id": {"$in": facet_ids}}},
                {"$lookup": {
                    "from": "assunto",
                    "localField": "_id", 
                    "foreignField": "ata",
                    "as": "assuntos"
                }},
                {"$unwind": "$assuntos"},
                {"$group": {
                    "_id": {
                        "ata_id": "$_id",
                        "topico": "$assuntos.topico"
                    }
                }},
                {"$group": {
                    "_id": "$_id.topico",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]
            
            # 3rd facet pipeline - parties (counting the unique atas per party)
            parties_facet_pipeline = [
                {"$match": {"_id": {"$in": facet_ids}}},
                {"$unwind": "$participantes"},
                {"$lookup": {
                    "from": "participante",
                    "localField": "participantes",
                    "foreignField": "_id",
                    "as": "participante_info"
                }},
                {"$unwind": "$participante_info"},
                {"$unwind": "$participante_info.mandatos"},
                {"$group": {
                    "_id": {
                        "ata_id": "$_id",
                        "party": "$participante_info.mandatos.party"
                    }
                }},
                {"$group": {
                    "_id": "$_id.party",
                    "count": {"$sum": 1}
                }},
                {"$match": {
                    "_id": {"$ne": None}
                }},
                {"$sort": {"count": -1}}
            ]
            
            try:
                # facets
                facets = list(atas_collection.aggregate(main_facet_pipeline))[0]
                topics_result = list(atas_collection.aggregate(topics_facet_pipeline))
                parties_result = list(atas_collection.aggregate(parties_facet_pipeline))
                facets["topicos"] = topics_result
                facets["parties"] = parties_result
                
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Calculate these dates once
                last_week = today - timedelta(days=7)
                last_month = today - timedelta(days=30)
                last_quarter = today - timedelta(days=90)
                last_year = today - timedelta(days=365)
                
                date_pipeline = [
                    {"$match": {"_id": {"$in": facet_ids}}},
                    {"$facet": {
                        "last_week": [
                            {"$match": {"date": {"$gte": last_week}}},
                            {"$count": "count"}
                        ],
                        "last_month": [
                            {"$match": {"date": {"$gte": last_month}}},
                            {"$count": "count"}
                        ],
                        "last_quarter": [
                            {"$match": {"date": {"$gte": last_quarter}}},
                            {"$count": "count"}
                        ],
                        "last_year": [
                            {"$match": {"date": {"$gte": last_year}}},
                            {"$count": "count"}
                        ],
                        "all_time": [
                            {"$count": "count"}
                        ]
                    }}
                ]
                
                date_results = list(atas_collection.aggregate(date_pipeline))
                
                if date_results and date_results[0]:
                    date_counts = date_results[0]
                    facets["date_presets"] = [
                        {"_id": "all", "label": "All Time", 
                         "count": date_counts.get("all_time", [{"count": 0}])[0].get("count", 0) if date_counts.get("all_time") else len(facet_ids)},
                        {"_id": "last_week", "label": "Last Week", 
                         "count": date_counts.get("last_week", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_week") else 0},
                        {"_id": "last_month", "label": "Last Month", 
                         "count": date_counts.get("last_month", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_month") else 0},
                        {"_id": "last_quarter", "label": "Last Quarter", 
                         "count": date_counts.get("last_quarter", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_quarter") else 0},
                        {"_id": "last_year", "label": "Last Year", 
                         "count": date_counts.get("last_year", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_year") else 0},
                        {"_id": "custom", "label": "Custom Period", "count": 0}
                    ]
                else:
                    # Fallback if aggregation failed
                    facets["date_presets"] = [
                        {"_id": "all", "label": "All Time", "count": len(facet_ids)},
                        {"_id": "last_week", "label": "Last Week", "count": 0},
                        {"_id": "last_month", "label": "Last Month", "count": 0},
                        {"_id": "last_quarter", "label": "Last Quarter", "count": 0},
                        {"_id": "last_year", "label": "Last Year", "count": 0},
                        {"_id": "custom", "label": "Custom Period", "count": 0}
                    ]
                
                # converting OIDs
                for facet_group in facets.values():
                    for item in facet_group:
                        if isinstance(item["_id"], ObjectId):
                            item["_id"] = str(item["_id"])
                        elif isinstance(item["_id"], datetime):
                            item["_id"] = item["_id"].year
                            
                search_logger.debug(f"Generated facets with {len(facets.get('topicos', []))} topics")
                if "municipios" in facets:
                    municipio_ids_facets = []
                    for item in facets["municipios"]:
                        id_value = item["_id"]
                        if isinstance(id_value, str) and ObjectId.is_valid(id_value):
                            municipio_ids_facets.append(ObjectId(id_value))
                        elif isinstance(id_value, ObjectId):
                            municipio_ids_facets.append(id_value)
                            item["_id"] = str(id_value)
                    if municipio_ids_facets:
                        municipio_map = {
                            str(m.id): {"name": m.name, "name_en": m.name_en if hasattr(m, 'name_en') else None} 
                            for m in Municipio.objects(id__in=municipio_ids_facets).using(db_alias).only("id", "name", "name_en")
                        }
                        for item in facets["municipios"]:
                            municipio_data = municipio_map.get(item["_id"], {"name": "Desconhecido", "name_en": None})
                            item["name"] = municipio_data["name"]
                            item["name_en"] = municipio_data["name_en"]
                if "participants" in facets:
                    participant_ids_facets = []
                    for item in facets["participants"]:
                        id_value = item["_id"]
                        if isinstance(id_value, str):
                            if ObjectId.is_valid(id_value):
                                participant_ids_facets.append(ObjectId(id_value))
                        elif isinstance(id_value, ObjectId):
                            participant_ids_facets.append(id_value)
                            item["_id"] = str(id_value)
                    if participant_ids_facets:
                        participant_map = {
                            str(p.id): {"name": p.name, "name_en": None} 
                            for p in Participante.objects(id__in=participant_ids_facets).using(db_alias).only("id", "name")
                        }
                        for item in facets["participants"]:
                            if isinstance(item["_id"], str) and ObjectId.is_valid(item["_id"]):
                                participant_data = participant_map.get(item["_id"], {"name": "Desconhecido", "name_en": None})
                                item["name"] = participant_data["name"]
                                item["name_en"] = participant_data["name_en"]
                            else:
                                item["name"] = item["_id"]
                                item["name_en"] = None
                if "topicos" in facets:
                    topico_ids = [
                        ObjectId(item["_id"]) 
                        for item in facets["topicos"] 
                        if isinstance(item["_id"], str) and ObjectId.is_valid(item["_id"])
                    ]
                    topico_map = {
                        str(t.id): {"title": t.title, "title_en": t.title_en if hasattr(t, 'title_en') else None} 
                        for t in Topico.objects(id__in=topico_ids).using(db_alias).only("id", "title", "title_en")
                    }
                    for item in facets["topicos"]:
                        topico_data = topico_map.get(item["_id"], {"title": "Desconhecido", "title_en": None})
                        item["title"] = topico_data["title"]
                        item["title_en"] = topico_data["title_en"]
            except Exception as facet_error:
                search_logger.error(f"Facet generation error: {facet_error}")
                facets = {"years": [], "tipos": [], "municipios": [], "participants": [], "topicos": []}
        else:
            facets = {"years": [], "tipos": [], "municipios": [], "participants": [], "topicos": []}

        sort_prefix = "" if sort_order.lower() == "asc" else "-"
        sort_field = f"{sort_prefix}{sort_by}"

        total_atas = query.count()
        atas = query.order_by(sort_field).allow_disk_use(enabled=True).skip((page - 1) * per_page).limit(per_page)

        results = []
        for index, ata in enumerate(atas):
            position = (page - 1) * per_page + index + 1
            ata_result = {"id": str(ata.id),
                          "title": ata.title,
                          "title_en": ata.title_en if hasattr(ata, 'title_en') else None,
                          "location": ata.location,
                          "summary": ata.summary,
                          "summary_en": ata.summary_en if hasattr(ata, 'summary_en') else None,
                          "content": ata.content[:200] + "..." if len(ata.content or "") > 200 else ata.content,
                          "content_en": ata.content_en[:200] + "..." if hasattr(ata, 'content_en') and ata.content_en and len(ata.content_en) > 200 else (ata.content_en if hasattr(ata, 'content_en') else None),
                          "date": ata.date.date().isoformat() if ata.date else None,
                          "start_hour": ata.start_datetime.strftime("%H:%M") if ata.start_datetime else None,
                          "end_hour": ata.end_datetime.strftime("%H:%M") if ata.end_datetime else None,
                          "type": ata.tipo,
                          "slug": ata.slug,
                          "municipio": ata.municipio.name if ata.municipio else None,
                          "municipio_id": str(ata.municipio.id) if ata.municipio else None,
                          "position": position, "human_validated": ata.human_validated,
                          "status": ata.status}
            if keyword and ata.id in highlights_by_id:
                highlight_data = highlights_by_id[ata.id]
                ata_result["highlights"] = highlight_data["highlights"]
                ata_result["lang_match"] = highlight_data["lang_match"]
            results.append(ata_result)

        pagination = {"total": total_atas,"page": page,"per_page": per_page,"pages": (total_atas + per_page - 1) // per_page}

        start_date_str = start_datetime.isoformat() if start_datetime else None
        end_date_str = end_datetime.isoformat() if end_datetime else None
        
        search_logger.info(
            f"ip={ip_address} | auid={anon_user_id} | method=/atas/search | query={keyword} | title={title} | content={content} | tipo={tipo} | municipio_id={municipio_id} | participant_ids={participant_ids} | participants_logic={participants_logic} | party={party} | topicos={topicos} | topicos_logic={topicos_logic} | start_date={start_date_str} | end_date={end_date_str} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results={pagination['total']}"
        )
        # send_telegram_message(
        #     text=f"ip={ip_address} | auid={anon_user_id} | method=/atas/search | query={keyword} | title={title} | content={content} | tipo={tipo} | municipio_id={municipio_id} | participant_ids={participant_ids} | participants_logic={participants_logic} | party={party} | topicos={topicos} | topicos_logic={topicos_logic} | start_date={start_date_str} | end_date={end_date_str} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results={pagination['total']}"
        # )

        
        return jsonify({
            "anon_user_id": anon_user_id,
            "data": results,
            "pagination": pagination,
            "applied_filters": {
                "keyword": keyword,
                "title": title,
                "content": content,
                "tipo": tipo,
                "municipio_id": municipio_id,
                "participant_id": participant_ids,
                "participants_logic": participants_logic,
                "party": party,
                "topico": topicos,
                "topicos_logic": topicos_logic,
                "start_date": start_date_str,
                "end_date": end_date_str,
                "sort_by": sort_by,
                "sort_order": sort_order
            },
            "facets": facets,
            "autocomplete_suggestions": autocomplete_suggestions if keyword else [],
            "search_info": {
                "used_fallback": used_fallback,
                "search_method": search_method,
                "total_found": len(ata_ids) if ata_ids else 0
            }
        }), 200

    except Exception as e:
        search_logger.error(f"Public search error: {str(e)}")
        return jsonify({"error": f"Error processing search: {str(e)}"}), 500


@public_bp.route("/atas/<ata_id>/voting-summary", methods=["GET"])
def get_ata_voting_summary(ata_id):
    """
    Get detailed voting summary for a specific ata.
    ---
    tags:
      - Public
      - Meeting Minutes
      - Voting
    description: Returns voting summary and details for all subjects (subjects) in the specified municipal meeting minute.
    parameters:
      - in: path
        name: ata_id
        required: true
        schema:
          type: string
        description: municipal Meeting minute ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
      - in: query
        name: lang
        schema:
          type: string
          enum: [pt, en]
        description: Language for localized content (pt for Portuguese, en for English)
    responses:
      200:
        description: Voting summary for the municipal meeting minute
        content:
          application/json:
            schema:
              type: object
              properties:
                total_assuntos:
                  type: integer
                aprovados:
                  type: integer
                reprovados:
                  type: integer
                unanimes:
                  type: integer
                  description: Number of subjects approved/rejected unanimously
                maioria:
                  type: integer
                  description: Number of subjects approved/rejected by majority (not unanimous)
                votos_favor_total:
                  type: integer
                votos_contra_total:
                  type: integer
                abstencoes_total:
                  type: integer
                assuntos:
                  type: array
                  items:
                    type: object
      404:
        description: municipal Meeting minute not found
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /atas/<ata_id>/voting-summary endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"
    
    # Get language parameter
    lang = request.args.get("lang", "pt").lower()
    use_english = lang == "en"

    try:
        if ObjectId.is_valid(ata_id):
            ata = Ata.objects(id=ata_id).using(db_alias).first()
        else:
            ata = Ata.objects(slug=ata_id).using(db_alias).first()
        if not ata:
            return jsonify({"error": "Ata not found"}), 404
            
        # getting all the subjects
        assuntos = Assunto.objects(ata=ata).using(db_alias)
        
        # Calculate unanimity and majority
        unanimes = 0
        maioria = 0
        for assunto in assuntos:
            # Check if it's unanimous (no votes against and no abstentions, or all votes are the same type)
            total_favor = assunto.votos_favor
            total_contra = assunto.votos_contra
            total_abstencoes = assunto.abstencoes
            total_votos = total_favor + total_contra + total_abstencoes
            
            if total_votos > 0:
                # Unanimous if all votes are in favor OR all are against (and no abstentions)
                if (total_contra == 0 and total_abstencoes == 0) or (total_favor == 0 and total_abstencoes == 0):
                    unanimes += 1
                else:
                    maioria += 1
        
        # summary
        summary = {
            "total_assuntos": len(assuntos),
            "aprovados": sum(1 for a in assuntos if a.aprovado),
            "reprovados": sum(1 for a in assuntos if not a.aprovado),
            "unanimes": unanimes,
            "maioria": maioria,
            "votos_favor_total": sum(a.votos_favor for a in assuntos),
            "votos_contra_total": sum(a.votos_contra for a in assuntos),
            "abstencoes_total": sum(a.abstencoes for a in assuntos),
            "assuntos": []
        }
        
        # Add detailed data for each subject including who voted
        for assunto in assuntos:
            # Get topico title safely without dereferencing
            topico_title = None
            if 'topico' in assunto._data and assunto._data['topico']:
                topico_ref = assunto._data['topico']
                topico_id = topico_ref.id if hasattr(topico_ref, 'id') else topico_ref
                try:
                    topico = Topico.objects.using(db_alias).get(id=topico_id)
                    topico_title = topico.title_en if use_english and hasattr(topico, 'title_en') and topico.title_en else topico.title
                except DoesNotExist:
                    current_app.logger.warning(f"Topico {topico_id} not found in {db_alias} database")
                except Exception as e:
                    current_app.logger.error(f"Error fetching topico for voting summary: {str(e)}")
            
            assunto_data = {
                "id": str(assunto.id),
                "title": assunto.title_en if use_english and hasattr(assunto, 'title_en') and assunto.title_en else assunto.title,
                "topico": topico_title,
                "votos_favor": assunto.votos_favor,
                "votos_contra": assunto.votos_contra,
                "abstencoes": assunto.abstencoes,
                "aprovado": assunto.aprovado,
                "total_votos": len(assunto.votos),
                "detalhes_votos": []
            }
            
            # Group votes by type for easier display
            votos_por_tipo = {
                "favor": [],
                "contra": [],
                "abstencao": []
            }
            
            # Process individual votes
            for voto in assunto.votos:
                # Get participante safely without dereferencing
                if 'participante' in voto._data and voto._data['participante']:
                    participante_ref = voto._data['participante']
                    participante_id = participante_ref.id if hasattr(participante_ref, 'id') else participante_ref
                    try:
                        participante = Participante.objects.using(db_alias).get(id=participante_id)
                        
                        mandato_for_ata = None
                        if hasattr(participante, "mandatos") and participante.mandatos:
                            for mandato in participante.mandatos:
                                if mandato.term_start and mandato.term_end:
                                    if mandato.term_start <= ata.date.year <= mandato.term_end:
                                        mandato_for_ata = mandato
                                        break
                                elif not mandato.term_start and not mandato.term_end:
                                    mandato_for_ata = mandato
                                    break
                        
                        participante_info = {
                            "id": str(participante.id),
                            "nome": participante.name,
                            "sort": mandato_for_ata.sort if mandato_for_ata else None,
                            "cargo": mandato_for_ata.role_en if use_english and mandato_for_ata and hasattr(mandato_for_ata, 'role_en') and mandato_for_ata.role_en else (mandato_for_ata.role if mandato_for_ata else None),
                            "partido": mandato_for_ata.party if mandato_for_ata else None,
                        }
                        votos_por_tipo[voto.tipo].append(participante_info)
                    except DoesNotExist:
                        current_app.logger.warning(f"Participante {participante_id} not found in {db_alias} database")
                        continue
                    except Exception as e:
                        current_app.logger.error(f"Error fetching participante for vote: {str(e)}")
                        continue
            
            assunto_data["detalhes_votos"] = votos_por_tipo
            summary["assuntos"].append(assunto_data)
        
        return jsonify(summary), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving voting summary: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

@public_bp.route("/atas/<ata_id>/view", methods=["GET"])
def view_ata(ata_id):
    """
    Public endpoint to view minute files in the browser (PDF, DOC, DOCX).
    ---
    tags:
      - Public
      - Meeting Minutes
      - Files
    description: Returns the minute file for viewing in the browser.
    parameters:
      - in: path
        name: ata_id
        required: true
        schema:
          type: string
        description: Minute ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: File sent for viewing
        content:
          application/pdf:
            schema:
              type: string
              format: binary
      404:
        description: File not found
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /atas/<ata_id>/view endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        if ObjectId.is_valid(ata_id):
            ata = Ata.objects.using(db_alias).get(id=ata_id)
        else:
            ata = Ata.objects.using(db_alias).get(slug=ata_id)
        
        # Only allow viewing files with status="pending" (for testing)
        # if ata.status != "pending":
        #     return jsonify({"error": "Ata not available"}), 404
        
        # Verify the file exists
        if not os.path.exists(ata.file_path):
            return jsonify({"error": "Arquivo não encontrado"}), 404

        # Get file extension to determine content type
        file_extension = os.path.splitext(ata.file_path)[1].lower()
        
        # Set appropriate content type based on file extension
        content_type = "application/pdf"  # Default for PDF
        if file_extension == ".doc":
            content_type = "application/msword"
        elif file_extension == ".docx":
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
        # Send the file with appropriate headers for viewing in browser
        response = send_file(
            ata.file_path,
            mimetype=content_type,
            as_attachment=False,
            download_name=ata.file_name
        )
        
        # Add header to suggest browser displays it inline
        response.headers["Content-Disposition"] = f'inline; filename="{ata.file_name}"'
        
        return response
        
    except DoesNotExist:
        return jsonify({"error": "Ata não encontrada"}), 404
    except ValidationError:
        return jsonify({"error": "ID da ata inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error viewing ata file: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao visualizar o arquivo"}), 500

@public_bp.route("/atas/<ata_id>/download", methods=["GET"])
def download_ata(ata_id):
    """
    Public endpoint to download ata files (only for status=done).
    ---
    tags:
      - Public
      - Meeting Minutes
      - Files
    description: Download the municipal meeting minute file if available.
    parameters:
      - in: path
        name: ata_id
        required: true
        schema:
          type: string
        description: municipal Meeting minute ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: File sent for download
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
      403:
        description: File not available for download
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      404:
        description: File not found
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /atas/<ata_id>/download endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        if ObjectId.is_valid(ata_id):
            ata = Ata.objects.using(db_alias).get(id=ata_id)
        else:
            ata = Ata.objects.using(db_alias).get(slug=ata_id)
        
        # Only allow downloading files with status="done"
        if ata.status != "done" or ata.status != "pending":  # "pending" for testing
            return jsonify({"error": "Arquivo não disponível para download"}), 403
        
        # Verificação: ficheiro existe ?
        if not os.path.exists(ata.file_path):
            return jsonify({"error": "Arquivo não encontrado"}), 404

        filename = os.path.basename(ata.file_path)
        
        response = send_file(ata.file_path, as_attachment=True)
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
        
    except (DoesNotExist, ValidationError):
        return jsonify({"error": "Ata não encontrada"}), 404
    except Exception as e:
        current_app.logger.error(f"Download error: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao fazer o download"}), 500
    
@public_bp.route("/atas/<ata_id>", methods=["GET"])
def get_ata(ata_id):
    """
    Public endpoint to get details of a specific minute.
    ---
    tags:
      - Public
      - Meeting Minutes
    description: Returns detailed information about a minute, including participants and subjects.
    parameters:
      - in: path
        name: ata_id
        required: true
        schema:
          type: string
        description: Minute ID or slug
      - in: query
        name: position
        schema:
          type: integer
        description: Position in search results
      - in: query
        name: current_url
        schema:
          type: string
        description: Referrer URL
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
      - in: query
        name: lang
        schema:
          type: string
          enum: [pt, en]
        description: Language for localized content (pt for Portuguese, en for English)
    responses:
      200:
        description: Minute details
        content:
          application/json:
            schema:
              type: object
      404:
        description: Minute not found
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      400:
        description: Invalid minute ID
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"
    
    # Get language parameter
    lang = request.args.get("lang", "pt").lower()
    use_english = lang == "en"

    try:
        if ObjectId.is_valid(ata_id):
            ata = Ata.objects.using(db_alias).get(id=ata_id)
        else:
            ata = Ata.objects.using(db_alias).get(slug=ata_id)
        
        current_app.logger.info(f"auid: {anon_user_id} - /atas/{ata_id} endpoint accessed") 
        # Only return atas with status="done"
        # pending temporariamente para testes
        # if ata.status != "pending" and ata.status != "done":
        #     return jsonify({"error": "Ata not available"}), 404

        position = request.args.get("position", None)
        if position:
            try:
                position = int(position)
                search_logger.info(f"auid: {anon_user_id} | ")
            except ValueError:
                return jsonify({"error": "Invalid position parameter"}), 400
            
        current_url = request.args.get("current_url", None)
        # if current_url and position is not None:
        #     search_logger.info(f"auid: {anon_user_id} | ata_id: {ata.id} at position: {position} from URL: {current_url}")
        # elif current_url != None and current_url != "":
        #     search_logger.info(f"auid: {anon_user_id} | ata_id: {ata.id} accessed without position from URL: {current_url}")
        # else:
        #     search_logger.info(f"auid: {anon_user_id} | ata_id: {ata.id} accessed without position or URL")

            
        # Prepare participant data
        participantes_data = []
        if ata.participantes:
            for participante in ata.participantes:
                if not participante:  # Check if participante is None
                    continue
                    
                mandato_for_ata = None
                if hasattr(participante, "mandatos"):
                    for mandato in participante.mandatos:
                        if mandato.term_start and mandato.term_end:
                            if mandato.term_start <= ata.date.year <= mandato.term_end:
                                mandato_for_ata = mandato
                                break
                        elif not mandato.term_start and not mandato.term_end:
                            mandato_for_ata = mandato
                            break

                participantes_data.append({
                    "id": str(participante.id) if participante and hasattr(participante, 'id') else None,
                    "name": getattr(participante, 'name', None) if participante else None,
                    "role": getattr(mandato_for_ata, "role_en", None) if use_english and mandato_for_ata and hasattr(mandato_for_ata, "role_en") and getattr(mandato_for_ata, "role_en") else getattr(mandato_for_ata, "role", None) if mandato_for_ata else None,
                    "party": getattr(mandato_for_ata, "party", None) if mandato_for_ata else None,
                    "term_start": getattr(mandato_for_ata, "term_start", None) if mandato_for_ata else None,
                    "term_end": getattr(mandato_for_ata, "term_end", None) if mandato_for_ata else None,
                    "sort": getattr(mandato_for_ata, "sort", None) if mandato_for_ata else None,
                    "slug": getattr(participante, 'slug', None) if participante else None,
                    "profile_photo": f"/uploads/participantes/{clean_name(ata.municipio.name)}/{participante.image_filename}" if participante and hasattr(participante, 'image_filename') and participante.image_filename and ata.municipio and hasattr(ata.municipio, 'name') else None,
                })
        
        # Get assuntos (subjects) related to this ata
        assuntos_data = []
        assuntos = Assunto.objects(ata=ata).using(db_alias)
        for assunto in assuntos:
            assunto_data = {
                "id": str(assunto.id),
                "title": assunto.title_en if use_english and hasattr(assunto, 'title_en') and assunto.title_en else assunto.title,
                "summary": assunto.summary_en if use_english and hasattr(assunto, 'summary_en') and assunto.summary_en else assunto.summary,
                "deliberacao": assunto.deliberacao_en if use_english and hasattr(assunto, 'deliberacao_en') and assunto.deliberacao_en else assunto.deliberacao,
                "votos_favor": assunto.votos_favor,
                "aprovado": assunto.aprovado,
                "votos_contra": assunto.votos_contra,
                "abstencoes": assunto.abstencoes
            }
            
            # Include topico (department) info if available
            if assunto.topico:
                assunto_data["topico"] = {
                    "id": str(assunto.topico.id),
                    "title": assunto.topico.title_en if use_english and hasattr(assunto.topico, 'title_en') and assunto.topico.title_en else assunto.topico.title
                }
                
            assuntos_data.append(assunto_data)

        if position != None and position != 0:
            search_logger.info(f"AUID: {anon_user_id} - Choose  ID: {ata.id} (Position: {position})")
        
        search_logger.info(
            f"auid={anon_user_id} | method=/atas/{ata_id} | position={position} | before_url={current_url} | municipio={ata.municipio.name} | municipio_id={str(ata.municipio.id)} | title={ata.title} | tipo={ata.tipo} | date={ata.date.isoformat() if ata.date else None} | participantes_count={len(participantes_data)} | assuntos_count={len(assuntos_data)}"
        )
        return jsonify({
            "id": str(ata.id),
            "position": position if position is not None else None,
            "before_url": current_url if current_url else None,
            "municipio": ata.municipio.name_en if use_english and ata.municipio and hasattr(ata.municipio, 'name_en') and ata.municipio.name_en else (ata.municipio.name if ata.municipio and hasattr(ata.municipio, 'name') else None),
            "municipio_slug": ata.municipio.slug if ata.municipio and hasattr(ata.municipio, 'slug') else None,
            "municipio_image": f"/uploads/municipios/{clean_name(ata.municipio.name)}/{ata.municipio.squared_image_filename}" if ata.municipio and hasattr(ata.municipio, 'name') and hasattr(ata.municipio, 'squared_image_filename') and ata.municipio.squared_image_filename else None,
            "municipio_id": str(ata.municipio.id) if ata.municipio and hasattr(ata.municipio, 'id') else None,
            "title": ata.title_en if use_english and hasattr(ata, 'title_en') and ata.title_en else ata.title,
            "short_title": ata.short_title_en if use_english and hasattr(ata, 'short_title_en') and ata.short_title_en else ata.short_title,
            "content": ata.content_en if use_english and hasattr(ata, 'content_en') and ata.content_en else ata.content,
            "summary": ata.summary_en if use_english and hasattr(ata, 'summary_en') and ata.summary_en else ata.summary,
            "processed_content": ata.processed_content,
            "human_validated": ata.human_validated,
            "location": ata.location,
            "tipo": ata.tipo,
            "date": ata.date.isoformat() if ata.date else None,
            "start_datetime": ata.start_datetime.isoformat() if ata.start_datetime else None,
            "end_datetime": ata.end_datetime.isoformat() if ata.end_datetime else None,
            "file_name": ata.file_name,
            "file_type": ata.file_type,
            "uploaded_at": ata.uploaded_at.isoformat() if ata.uploaded_at else None,
            "file_url": f"/public/atas/{str(ata.id)}/view" if ata.file_path else None,
            "slug": ata.slug,
            "pdf_file_name": ata.pdf_file_name,
            "pdf_file_path": ata.pdf_file_path,
            "pdf_url": f"/public/atas/{str(ata.id)}/view" if ata.pdf_file_path else None,
            "participantes": participantes_data,
            "assuntos": assuntos_data
        }), 200
        
    except DoesNotExist:
        return jsonify({"error": "Ata not found"}), 404
    except ValidationError:
        return jsonify({"error": "Invalid ata ID"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving ata details: {str(e)}")
        import traceback
        current_app.logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Error retrieving ata details: {str(e)}"}), 500


@public_bp.route("/municipios", methods=["GET"])
def get_municipios():
    """Get list of municipalities
    ---
    tags:
      - Public
      - City Council
    description: Returns basic information about all city councils, optionally with statistics.
    parameters:
      - in: query
        name: stats
        schema:
          type: string
          enum: ["1", "0", "true", "false"]
        description: Include statistics (municipal meeting minutes count, etc.)
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: List of city councils
        content:
          application/json:
            schema:
              type: object
              properties:
                municipios:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                      slug:
                        type: string
                      image:
                        type: string
                      stats:
                        type: object
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /municipios endpoint accessed")

    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    stats = request.args.get("stats", "false").lower() in ["1", 1]

    try:
        municipios = Municipio.objects().using(db_alias)
        
        result = []
        for m in municipios:
            municipio_data = {
                "id": str(m.id),
                "slug": m.slug if hasattr(m, 'slug') else None,
                "name": m.name,
                "name_en": m.name_en if hasattr(m, 'name_en') else None,
                "website": m.website if hasattr(m, 'website') else None,
                "description": m.description if hasattr(m, 'description') else None,
                "description_en": m.description_en if hasattr(m, 'description_en') else None,
                "imageUrl": f"/uploads/municipios/{clean_name(m.name)}/{m.image_filename}" if hasattr(m, 'image_filename') and m.image_filename else None,
                "squaredImageUrl": f"/uploads/municipios/{clean_name(m.name)}/{m.squared_image_filename}" if hasattr(m, 'squared_image_filename') and m.squared_image_filename else None
            }
            if stats:
                total_atas = Ata.objects(municipio=m).using(db_alias).count()
                total_participantes = Participante.objects(municipio=m).using(db_alias).count()
                municipio_data["stats"] = {
                    "total_atas": total_atas,
                    "total_assuntos": 0,
                    "total_participantes": total_participantes
                }

            result.append(municipio_data)
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter municípios públicos: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao obter os municípios"}), 500
    
    
@public_bp.route("/municipios/<municipio_id>", methods=["GET"])
def get_municipio(municipio_id):
    """Get detailed information about a specific municipality
    ---
    tags:
      - Public
      - City Council
    description: Returns comprehensive information about a city council including statistics, participants, and topics.
    parameters:
      - in: path
        name: municipio_id
        required: true
        schema:
          type: string
        description: City council ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: City council details
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                slug:
                  type: string
                description:
                  type: string
                stats:
                  type: object
                participants:
                  type: array
                topics:
                  type: array
      404:
        description: City council not found
      400:
        description: Invalid city council ID
      500:
        description: Internal error
    """

    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /municipios/<municipio_id> endpoint accessed")
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"
    
    try:
        if ObjectId.is_valid(municipio_id):        # If municipio_id is a valid ObjectId, fetch by id
            municipio = Municipio.objects.using(db_alias).get(id=ObjectId(municipio_id))
        else:
            municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)


        # counters
        total_assuntos = 0
        total_pages = 0
        total_atas = Ata.objects(municipio=municipio).using(db_alias).count()
        total_participantes = Participante.objects(municipio=municipio).using(db_alias).count()
        
        # aggregation pipeline to count the pages
        pages_pipeline = [
            {"$match": {"municipio": municipio.id}},
            {"$group": {"_id": None, "total_pages": {"$sum": {"$ifNull": ["$pages", 0]}}}}
        ]
        pages_result = list(Ata.objects.using(db_alias).aggregate(*pages_pipeline))
        total_pages = pages_result[0]["total_pages"] if pages_result else 0
        
        # get atas and assuntos
        ata_objs = Ata.objects(municipio=municipio).using(db_alias).only('id')
        ata_ids = [str(ata.id) for ata in ata_objs]
        
        if ata_ids and len(ata_ids) > 0:
            try:
                object_ids = [ObjectId(id) for id in ata_ids]
                pipeline = [
                    {"$match": {"ata": {"$in": object_ids}}},
                    {"$project": {
                        "id": "$_id",
                        "has_votos": {"$cond": [
                            {"$and": [
                                {"$isArray": "$votos"},
                                {"$gt": [ {"$size": "$votos"}, 0 ]}
                            ]},
                            1,
                            0
                        ]}
                    }},
                    {"$group": {
                        "_id": None,
                        "total_assuntos": {"$sum": 1},
                        "assuntos_com_votos": {"$sum": "$has_votos"}
                    }}
                ]

                # Run the aggregation and get results
                result = list(Assunto.objects.using(db_alias).aggregate(*pipeline))
                
                # Extract data from results 
                if result: # aggregation
                    total_assuntos = result[0].get('total_assuntos', 0)
                    assuntos_com_votos = result[0].get('assuntos_com_votos', 0)
                else:
                    total_assuntos = Assunto.objects(ata__in=ata_ids).using(db_alias).count()
                    assuntos_com_votos = 0
                        
            except Exception as e:
                total_assuntos = Assunto.objects(ata__in=ata_ids).using(db_alias).count()
                assuntos_com_votos = 0
        
        current_participants = []
        participantes = Participante.objects(municipio=municipio).using(db_alias)
        for p in participantes:
            sort = None
            role = None
            role_en = None
            party = None
            p.active = False 
            for mandato in p.mandatos:
                if mandato.term_start and mandato.term_end:
                    if mandato.term_start <= datetime.now(timezone.utc).year <= mandato.term_end:
                        p.active = True
                        sort = mandato.sort if hasattr(mandato, 'sort') else None
                        role = mandato.role if hasattr(mandato, 'role') else None
                        role_en = mandato.role_en if hasattr(mandato, 'role_en') else role
                        party = mandato.party if hasattr(mandato, 'party') else None
                        break
                elif not mandato.term_start and not mandato.term_end:
                    p.active = True
                    sort = None
                    role = None
                    role_en = None
                    party = None
                    break
            if p.active:
                current_participants.append({
                    "id": str(p.id),
                    "name": p.name,
                    "slug": p.slug if hasattr(p, 'slug') else None,
                    "role": role,
                    "role_en": role_en,
                    "participante_type": p.participante_type,
                    "party": party,
                    "profile_photo": f"/uploads/participantes/{clean_name(municipio.name)}/{p.image_filename}" if hasattr(p, 'image_filename') and p.image_filename else None,
                    "sort": sort
                })

        all_participants = []
        all_participants_query = Participante.objects(municipio=municipio).using(db_alias)
        for p in all_participants_query:
            sort = None
            role = None
            role_en = None
            party = None
            for mandato in p.mandatos:
                if mandato.term_start and mandato.term_end:
                    if mandato.term_start <= datetime.now(timezone.utc).year <= mandato.term_end:
                        sort = mandato.sort if hasattr(mandato, 'sort') else None
                        role = mandato.role if hasattr(mandato, 'role') else None
                        role_en = mandato.role_en if hasattr(mandato, 'role_en') else role
                        party = mandato.party if hasattr(mandato, 'party') else None
                        break
                elif not mandato.term_start and not mandato.term_end:
                    sort = None
                    role = None
                    role_en = None
                    party = None
                    break
            all_participants.append({
                "id": str(p.id),
                "name": p.name,
                "slug": p.slug if hasattr(p, 'slug') else None,
                "role": role,
                "role_en": role_en,
                "participante_type": p.participante_type,
                "party": party,
                "profile_photo": f"/uploads/participantes/{clean_name(municipio.name)}/{p.image_filename}" if hasattr(p, 'image_filename') and p.image_filename else None,
                "sort": sort
            })
        
        result = {
            "id": str(municipio.id),
            "name": municipio.name,
            "name_en": municipio.name_en if hasattr(municipio, 'name_en') else municipio.name,
            "slug": municipio.slug,
            "website": municipio.website if hasattr(municipio, 'website') else None,
            "description": municipio.description if hasattr(municipio, 'description') else None,
            "description_en": municipio.description_en if hasattr(municipio, 'description_en') else municipio.description if hasattr(municipio, 'description') else None,
            "imageUrl": f"/uploads/municipios/{clean_name(municipio.name)}/{municipio.image_filename}" if hasattr(municipio, 'image_filename') and municipio.image_filename else None,
            "squaredImageUrl": f"/uploads/municipios/{clean_name(municipio.name)}/{municipio.squared_image_filename}" if hasattr(municipio, 'squared_image_filename') and municipio.squared_image_filename else None,
            "stats": {
                "total_atas": total_atas if total_atas > 0 else 0,
                "total_assuntos": total_assuntos if total_atas > 0 else 0,
                "total_assuntos_com_votos": assuntos_com_votos if total_assuntos > 0 else 0,
                "total_participantes": total_participantes,
                "total_pages": total_pages
            },
            "current_participants": current_participants,
            "all_participants": all_participants
        }
        
        return jsonify(result), 200
    except DoesNotExist:
        return jsonify({"error": "Município não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID de município inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Erro ao obter município público: {str(e)}")
        return jsonify({"error": f"Ocorreu um erro ao obter os detalhes do município {str(e)}"}), 500
    

@public_bp.route("/atas/<ata_id>/topicos/<topico_id>", methods=["GET"])
def get_ata_topico(ata_id, topico_id):
    """Get details of a specific topic within an ata
    ---
    tags:
      - Public
      - Meeting Minutes
      - Topics
    description: Returns detailed information about a topic (topic) and its associated subjects (subjects) within a specific municipal meeting minute. Both ata_id and topico_id can be either ObjectIds or slugs.
    parameters:
      - in: path
        name: ata_id
        required: true
        schema:
          type: string
        description: municipal Meeting minute ID or slug
      - in: path
        name: topico_id
        required: true
        schema:
          type: string
        description: Topic ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Topic details with associated subjects
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                assuntos:
                  type: array
      404:
        description: municipal Meeting minute or topic not found
      400:
        description: Invalid ID
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /atas/<ata_id>/topicos/<topico_id> endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # verifica se existe
        if ObjectId.is_valid(ata_id):
            ata = Ata.using(db_alias).get(id=ata_id)
        else:
            ata = Ata.objects.using(db_alias).get(slug=ata_id)
        
        # Only return atas with status="done"
        # pending para testes
        if ata.status != "pending" and ata.status != "done":
            return jsonify({"error": "Ata não disponível"}), 404
            
        # Verify the topico exists - support both ID and slug
        if ObjectId.is_valid(topico_id):
            topico = Topico.objects.using(db_alias).get(id=topico_id)
        else:
            # Try to find by slug
            topico = Topico.objects.using(db_alias).get(slug=topico_id)
        
        # Get assuntos for this ata and topico
        assuntos_data = []
        for assunto in Assunto.objects(ata=ata, topico=topico).using(db_alias):
            assunto_data = {
                "id": str(assunto.id),
                "title": assunto.title,
                "deliberacao": assunto.deliberacao,
                "aprovado": assunto.aprovado,
                "votos_favor": assunto.votos_favor,
                "votos_contra": assunto.votos_contra,
                "abstencoes": assunto.abstencoes,
            }
            assuntos_data.append(assunto_data)
        
        assuntos_data.sort(key=lambda x: x.get("ordem", 999) if x.get("ordem") is not None else 999)
        
        ata_data = {
            "id": str(ata.id),
            "slug": ata.slug,
            "title": ata.title if hasattr(ata, 'title') else None,
            "date": ata.date.isoformat() if hasattr(ata, 'date') and ata.date else None,
            "municipio": ata.municipio.name,
            "municipio_id": str(ata.municipio.id),
            "file_url": f"/public/atas/{str(ata.id)}/view" if ata.file_path else None,
            "file_type": ata.file_type
        }
        
        # Tópico
        topico_data = {
            "id": str(topico.id),
            "title": topico.title,
            "participante": {
                "id": str(topico.participante.id),
                "name": topico.participante.name,
                "role": topico.participante.role
            } if hasattr(topico, 'participante') and topico.participante else None
        }
        
        return jsonify({
            "ata": ata_data,
            "topico": topico_data,
            "assuntos": assuntos_data,
            "total_assuntos": len(assuntos_data),
            "aprovados": sum(1 for a in assuntos_data if a["aprovado"]),
            "reprovados": sum(1 for a in assuntos_data if not a["aprovado"])
        }), 200
        
    except DoesNotExist:
        return jsonify({"error": "Ata ou tópico não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving department details: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao obter os detalhes do tópico"}), 500

@public_bp.route("/municipios/<municipio_id>/topicos", methods=["GET"])
def get_municipio_topicos(municipio_id):
    """Get all topics for a municipality
    ---
    tags:
      - Public
      - City Council
      - Topics
    description: Returns all topics discussed in a specific city council with statistics.
    parameters:
      - in: path
        name: municipio_id
        required: true
        schema:
          type: string
        description: City council ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: List of topics with statistics
        content:
          application/json:
            schema:
              type: object
              properties:
                municipio:
                  type: object
                topicos:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                      atas_count:
                        type: integer
      404:
        description: City council not found
      400:
        description: Invalid city council ID
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /municipios/<municipio_id>/topicos endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # Get optional year parameter
        year = request.args.get("year", type=int)
        
        if ObjectId.is_valid(municipio_id):
            municipio = Municipio.objects.using(db_alias).get(id=ObjectId(municipio_id))
        else:
            municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)
        
        # Build query for atas with optional year filter
        atas_query = {"municipio": municipio}
        
        if year:
            # Filter by year
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            atas_query["date__gte"] = start_date
            atas_query["date__lt"] = end_date
        
        # Get all atas ids for this municipality (with optional year filter)
        atas = Ata.objects(**atas_query).using(db_alias).only('id')
        total_atas = len(atas)
        ata_ids = [ata.id for ata in atas]
        
        if not ata_ids:
            response = {
                "topicos": [],
                "total_atas": 0,
                "total_assuntos": 0,
                "year": year
            }
            return jsonify(response), 200
        
        pipeline = [
            {"$match": {"ata": {"$in": ata_ids}}},
            
            {"$group": {
                "_id": "$topico",
                "unique_atas": {"$addToSet": "$ata"},
                "assuntos_count": {"$sum": 1}
            }},
            
            {"$project": {
                "topico": "$_id",
                "unique_atas_count": {"$size": "$unique_atas"},
                "assuntos_count": 1
            }}
            
        ]
        
        topicos_stats = list(Assunto.objects.using(db_alias).aggregate(*pipeline))
        
        if not topicos_stats:
            response = {
                "topicos": [],
                "total_atas": total_atas,
                "total_assuntos": 0,
                "year": year
            }
            return jsonify(response), 200
        
        # Get all topicos to get their details
        topico_ids = [stats["topico"] for stats in topicos_stats]
        all_topicos = {str(topico.id): topico for topico in Topico.objects(id__in=topico_ids).using(db_alias)}
        
        # Build the result
        result = []
        for stats in topicos_stats:
            topico_id = str(stats["topico"]);
            
            if topico_id in all_topicos:
                topico = all_topicos[topico_id]
                result.append({
                    "id": topico_id,
                    "name": topico.title,
                    "name_en": topico.title_en if hasattr(topico, 'title_en') else topico.title if hasattr(topico, 'title') else None,
                    "slug": topico.slug if hasattr(topico, 'slug') else None,
                    "slug_en": topico.slug_en if hasattr(topico, 'slug_en') else topico.slug if hasattr(topico, 'slug') else None,
                    "subjects_count": stats["assuntos_count"],
                    "atas_count": stats["unique_atas_count"]
                })
        

        # Sort the result by name alphabetically
        result.sort(key=lambda x: x["name"].lower())
        total_assuntos = sum(item["subjects_count"] for item in result)

        response = {
            "topicos": result,
            "total_atas": total_atas,
            "total_assuntos": total_assuntos,
            "year": year
        }

        return jsonify(response), 200
        
    except DoesNotExist:
        return jsonify({"error": "Município não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID de município inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving topicos: {str(e)}")
        return jsonify({"error": f"Ocorreu um erro ao obter os tópicos do município {str(e)}"}), 500
    

@public_bp.route("/municipios/<municipio_id>/topicos/<topico_id>", methods=["GET"])
def get_topico(municipio_id, topico_id):
    """Get detailed information about a specific topic in a municipality
    ---
    tags:
      - Public
      - City Council
      - Topics
    description: Returns detailed information about a specific topic within a city council, including related municipal meeting minutes.
    parameters:
      - in: path
        name: municipio_id
        required: true
        schema:
          type: string
        description: City council ID or slug
      - in: path
        name: topico_id
        required: true
        schema:
          type: string
        description: Topic ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Topic details
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                municipio:
                  type: object
                atas_count:
                  type: integer
      404:
        description: City council or topic not found
      400:
        description: Invalid ID
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    current_app.logger.info(f"AUID: {anon_user_id} - /municipios/<municipio_id>/topicos/<topico_id> endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # First get the municipio
        if ObjectId.is_valid(municipio_id):
            municipio = Municipio.objects.using(db_alias).get(id=ObjectId(municipio_id))
        else:
            municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)
        
        # Get the topico - support both ID and slug
        if ObjectId.is_valid(topico_id):
            topico = Topico.objects.using(db_alias).get(id=topico_id)
        else:
            # Try to find by slug
            topico = Topico.objects.using(db_alias).get(slug=topico_id)
        
        # Use a more efficient approach - find municipio and make direct lookup in the assuntos collection
        # This avoids fetching all ata IDs first
        
        topico_id_obj = topico.id 
        # aggregation with a direct municipio lookup from assuntos via atas
        pipeline = [
            # First stage - join assuntos with atas to get the municipio data
            {
                "$lookup": {
                    "from": "ata",
                    "localField": "ata",
                    "foreignField": "_id",
                    "as": "ata_data"
                }
            },
            # Filter to only include assuntos for atas from this municipio and for this topico
            {
                "$match": {
                    "topico": topico_id_obj,
                    "ata_data.municipio": municipio.id
                }
            },
            # Group to calculate stats
            {
                "$group": {
                    "_id": None,
                    "total_assuntos": {"$sum": 1},
                    "unique_atas": {"$addToSet": "$ata"}
                }
            },
            # Project the final result
            {
                "$project": {
                    "_id": 0,
                    "total_assuntos": 1,
                    "total_atas": {"$size": "$unique_atas"}
                }
            }
        ]
        
        # Execute aggregation
        stats_result = list(Assunto.objects.using(db_alias).aggregate(*pipeline))
        
        # If no results from aggregation, return empty stats
        if not stats_result:
            stats = {
                "total_assuntos": 0,
                "total_atas": 0
            }
        else:
            stats = stats_result[0]
        
        # Use a more efficient approach for participante data
        participante_data = None
        if hasattr(topico, 'participante') and topico.participante:
            # Cache participante data instead of nested conditions
            participante = topico.participante
            image_filename = getattr(participante, 'image_filename', None)
            
            participante_data = {
                "id": str(participante.id),
                "name": participante.name,
                "role": participante.role,
                "profile_photo": f"/uploads/participantes/{clean_name(municipio.name)}/{image_filename}" 
                    if image_filename else None
            }
        
        # Build the result object directly
        result = {
            "id": str(topico.id),
            "name": topico.title,
            "name_en": topico.title_en if hasattr(topico, 'title_en') else topico.title if hasattr(topico, 'title') else None,
            "slug": topico.slug if hasattr(topico, 'slug') else None,
            "description": topico.description,
            "municipio": {
                "id": str(municipio.id),
                "name": municipio.name,
                "name_en": municipio.name_en if hasattr(municipio, 'name_en') else municipio.name,
                "slug": getattr(municipio, 'slug', None),
            },
            "participante": participante_data,
            "stats": {
                "total_assuntos": stats["total_assuntos"],
                "total_atas": stats["total_atas"]
            }
        }
        
        return jsonify(result), 200
        
    except DoesNotExist:
        return jsonify({"error": "Tópico não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID de tópico inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving topico details: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao obter os detalhes do tópico"}), 500


@public_bp.route("/municipios/<municipio_id>/topicos/<topico_id>/atas", methods=["GET"])
def get_municipio_topico_atas(municipio_id, topico_id):
    """Get all atas for a specific topic in a municipality
    ---
    tags:
      - Public
      - City Council
      - Topics
      - Meeting Minutes
    description: Returns paginated list of municipal meeting minutes that contain a specific topic in a city council.
    parameters:
      - in: path
        name: municipio_id
        required: true
        schema:
          type: string
        description: City council ID or slug
      - in: path
        name: topico_id
        required: true
        schema:
          type: string
        description: Topic ID or slug
      - in: query
        name: page
        schema:
          type: integer
          default: 1
        description: Page number
      - in: query
        name: per_page
        schema:
          type: integer
          default: 12
        description: Results per page
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Paginated list of municipal meeting minutes
        content:
          application/json:
            schema:
              type: object
              properties:
                atas:
                  type: array
                pagination:
                  type: object
      404:
        description: City council or topic not found
      400:
        description: Invalid ID
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    ip_address = request.remote_addr
    search_logger.info(f"ip={ip_address} | endpoint=/municipios/<municipio_id>/topicos/<topico_id>/atas")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # Get municipality and topico
        if ObjectId.is_valid(municipio_id):
            municipio = Municipio.objects.using(db_alias).get(id=ObjectId(municipio_id))
        else:
            municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)

        if ObjectId.is_valid(topico_id):
            topico = Topico.objects.using(db_alias).get(id=topico_id)
        else:
            topico = Topico.objects.using(db_alias).get(slug=topico_id)
        
        # Pagination parameters
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)
        
        # Use aggregation to get all relevant atas with their assuntos count in one query
        pipeline = [
            # Match assuntos for this topico
            {"$match": {"topico": topico.id}},
            
            # Lookup to join with atas collection
            {"$lookup": {
                "from": "ata",
                "localField": "ata",
                "foreignField": "_id",
                "as": "ata_info"
            }},
            
            # Unwind the ata array (converts it from array to object)
            {"$unwind": "$ata_info"},
            
            # Filter to only include atas from this municipality
            {"$match": {"ata_info.municipio": municipio.id}},
            
            # Group by ata to count assuntos
            {"$group": {
                "_id": "$ata_info._id",
                "assuntos_count": {"$sum": 1},
                "ata_data": {"$first": "$ata_info"}
            }},
            
            # Sort by date (most recent first)
            {"$sort": {"ata_data.date": -1}},
            
            # Count total results for pagination
            {"$facet": {
                "total": [{"$count": "count"}],
                "atas": [
                    {"$skip": (page - 1) * per_page},
                    {"$limit": per_page}
                ]
            }}
        ]
        
        # Execute aggregation
        agg_results = list(Assunto.objects.using(db_alias).aggregate(*pipeline))
        
        # Check if we got results
        if not agg_results or not agg_results[0]['total']:
            # Empty response if no results
            return jsonify({
                "atas": [],
                "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0},
                "topico": {
                    "id": str(topico.id),
                    "title": topico.title,
                    "slug": topico.slug if hasattr(topico, 'slug') else None
                }
            }), 200
        
        # Extract total count and atas data
        total_atas = agg_results[0]['total'][0]['count'] if agg_results[0]['total'] else 0
        ata_results = agg_results[0]['atas']
        
        # Format the results
        results = []
        for ata_result in ata_results:
            ata_data = ata_result['ata_data']
            
            # Format the date and times
            ata_date = ata_data.get('date').strftime("%Y-%m-%d") if ata_data.get('date') else None
            start_hour = ata_data.get('start_datetime').strftime("%H:%M") if ata_data.get('start_datetime') else None
            end_hour = ata_data.get('end_datetime').strftime("%H:%M") if ata_data.get('end_datetime') else None
            
            # Create formatted result
            formatted_ata = {
                "id": str(ata_data['_id']),
                "slug": ata_data.get('slug'),
                "title": ata_data.get('title'),
                "date": ata_date,
                "summary": ata_data.get('summary'),
                "type": ata_data.get('tipo'),
                "location": ata_data.get('location'),
                "start_hour": start_hour,
                "end_hour": end_hour,
                "file_url": f"/public/atas/{str(ata_data['_id'])}/view" if ata_data.get('file_path') else None,
                "assuntos_count": ata_result['assuntos_count']
            }
            results.append(formatted_ata)
            
        # Create pagination metadata
        pagination = {
            "total": total_atas,
            "page": page,
            "per_page": per_page,
            "pages": (total_atas + per_page - 1) // per_page
        }
        
        # Return complete response
        return jsonify({
            "atas": results,
            "pagination": pagination,
            "topico": {
                "id": str(topico.id),
                "title": topico.title,
                "slug": topico.slug if hasattr(topico, 'slug') else None
            }
        }), 200
        
    except DoesNotExist:
        return jsonify({"error": "Município ou tópico não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving atas: {str(e)}")
        return jsonify({"error": f"Ocorreu um erro ao obter as atas: {str(e)}"}), 500

@public_bp.route("/municipios/<municipio_id>/topicos/<topico_id>/assuntos", methods=["GET"])
def get_municipio_topico_assuntos(municipio_id, topico_id):
    """Get all subjects for a specific topic in a municipality
    ---
    tags:
      - Public
      - City Council
      - Topics
      - Subjects
    description: Returns paginated list of subjects (subjects) that belong to a specific topic in a city council, with filtering options.
    parameters:
      - in: path
        name: municipio_id
        required: true
        schema:
          type: string
        description: City council ID or slug
      - in: path
        name: topico_id
        required: true
        schema:
          type: string
        description: Topic ID or slug
      - in: query
        name: aprovado
        schema:
          type: string
          enum: ["true", "false"]
        description: Filter by approval status
      - in: query
        name: page
        schema:
          type: integer
          default: 1
        description: Page number
      - in: query
        name: per_page
        schema:
          type: integer
          default: 20
        description: Results per page
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Paginated list of subjects
        content:
          application/json:
            schema:
              type: object
              properties:
                assuntos:
                  type: array
                pagination:
                  type: object
                topico:
                  type: object
      404:
        description: City council or topic not found
      400:
        description: Invalid ID
      500:
        description: Internal error
    """
    ip_address = request.remote_addr
    search_logger.info(f"ip={ip_address} | endpoint=/municipios/{municipio_id}/topicos/{topico_id}/assuntos")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # Check if municipality and topico exist
        if ObjectId.is_valid(municipio_id):
            municipio = Municipio.using(db_alias).get(id=ObjectId(municipio_id))
        else:
            municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)

        # Get the topico - support both ID and slug
        if ObjectId.is_valid(topico_id):
            topico = Topico.objects.using(db_alias).get(id=topico_id)
        else:
            # Try to find by slug
            topico = Topico.objects.using(db_alias).get(slug=topico_id)

        # format topico data
        topico_data = {
            "id": str(topico.id),
            "title": topico.title,
            "title_en": topico.title_en if hasattr(topico, 'title_en') else topico.title if hasattr(topico, 'title') else None,
            "slug": topico.slug if hasattr(topico, 'slug') else None,
        }
        
        # Pagination parameters
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        
        # Filter parameters
        keyword = request.args.get("q", "").strip()
        aprovado = request.args.get("aprovado")
        ata_id = request.args.get("ata_id")
        
        # Get all atas for this municipality
        atas_query = {"municipio": municipio}
        if ata_id:
            atas_query["id"] = ata_id
            
        atas_ids = [str(ata.id) for ata in Ata.objects(**atas_query).using(db_alias).only('id')]
        
        # Build assuntos query
        assuntos_query = {"topico": topico}
        if atas_ids:
            assuntos_query["ata__in"] = atas_ids
        else:
            return jsonify({"assuntos": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
            
        if keyword:
            assuntos_query["title__icontains"] = keyword
            
        if aprovado is not None:
            aprovado_bool = aprovado.lower() == "true"
            assuntos_query["aprovado"] = aprovado_bool
            
        # Get counts for pagination
        total_assuntos = Assunto.objects(**assuntos_query).using(db_alias).count()
        
        # Get paginated assuntos
        assuntos = Assunto.objects(**assuntos_query).using(db_alias).skip((page-1)*per_page).limit(per_page)
        
        results = []
        for assunto in assuntos:
            ata = assunto.ata
            assunto_data = {
                "id": str(assunto.id),
                "title": assunto.title,
                "deliberacao": assunto.deliberacao, # Using deliberacao field as description
                "aprovado": assunto.aprovado,
                "votos_favor": assunto.votos_favor,
                "votos_contra": assunto.votos_contra,
                "abstencoes": assunto.abstencoes,
                "data_votacao": ata.date.isoformat() if ata.date else None,
                "ata": {
                    "id": str(ata.id),
                    "slug": ata.slug,
                    "title": ata.title,
                    "start_hour": ata.start_datetime.strftime("%H:%M") if ata.start_datetime else None,
                    "end_hour": ata.end_datetime.strftime("%H:%M") if ata.end_datetime else None,
                    "date": ata.date.isoformat() if ata.date else None,
                    "municipio": ata.municipio.name
                }
            }
            results.append(assunto_data)
            
        pagination = {
            "total": total_assuntos,
            "page": page,
            "per_page": per_page,
            "pages": (total_assuntos + per_page - 1) // per_page
        }
        
        return jsonify({"topico": topico_data, "assuntos": results, "pagination": pagination}), 200
        
    except DoesNotExist:
        return jsonify({"error": "Município ou tópico não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving assuntos: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao obter os assuntos"}), 500

@public_bp.route("/assuntos/<assunto_id>", methods=["GET"])
def get_assunto(assunto_id):
    """
    Public endpoint to get details of a specific assunto (subject).
    ---
    tags:
      - Public
      - Subjects
    description: Returns detailed information about an subject, including voting data and associated minute.
    parameters:
      - in: path
        name: assunto_id
        required: true
        schema:
          type: string
        description: Subject ID
      - in: query
        name: position
        schema:
          type: integer
        description: Position in search results
      - in: query
        name: current_url
        schema:
          type: string
        description: Referrer URL
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
      - in: query
        name: lang
        schema:
          type: string
          enum: [pt, en]
        description: Language for localized content (pt for Portuguese, en for English)
    responses:
      200:
        description: Subject details
      404:
        description: Subject not found
      400:
        description: Invalid subject ID
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    ip_address = request.remote_addr
    search_logger.info(f"ip={ip_address} | endpoint=/assuntos/{assunto_id}")

    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"
    
    # Get language parameter
    lang = request.args.get("lang", "pt").lower()
    use_english = lang == "en"
    try:
        current_app.logger.info(f"Fetching assunto {assunto_id} from {db_alias} database")
        try:
            assunto = Assunto.objects.using(db_alias).get(id=assunto_id)
            current_app.logger.info(f"Successfully fetched assunto {assunto_id}")
        except DoesNotExist:
            return jsonify({"error": "Assunto não encontrado"}), 404
        except ValidationError:
            return jsonify({"error": "ID de assunto inválido"}), 400
            
        # Get the associated ata using the correct database alias
        if 'ata' not in assunto._data or not assunto._data['ata']:
            return jsonify({"error": "Ata associada não encontrada"}), 404
        
        # Get ata ID directly from the DBRef without dereferencing
        ata_ref = assunto._data['ata']
        ata_id = ata_ref.id if hasattr(ata_ref, 'id') else ata_ref
        current_app.logger.info(f"Fetching ata {ata_id} from {db_alias} database")
        try:
            ata = Ata.objects.using(db_alias).get(id=ata_id)
            current_app.logger.info(f"Successfully fetched ata {ata.id}")
        except DoesNotExist:
            return jsonify({"error": "Ata associada não encontrada"}), 404
        except Exception as e:
            current_app.logger.error(f"Error fetching ata: {str(e)}")
            return jsonify({"error": "Erro ao buscar ata associada"}), 500
            
        if not hasattr(ata, 'status') or (ata.status != "pending" and ata.status != "done"):
            return jsonify({"error": "Assunto não disponível"}), 404
        
        position = request.args.get("position", None)
        if position:
            try:
                position = int(position)
                search_logger.info(f"auid: {anon_user_id} | ")
            except ValueError:
                position = None
            
        current_url = request.args.get("current_url", None)
        if current_url and position is not None:
            search_logger.info(f"auid: {anon_user_id} | ata_id: {ata.id} at position: {position} from URL: {current_url}")
        elif current_url != None and current_url != "":
            search_logger.info(f"auid: {anon_user_id} | ata_id: {ata.id} accessed without position from URL: {current_url}")
        else:
            search_logger.info(f"auid: {anon_user_id} | ata_id: {ata.id} accessed without position or URL")

        topico_data = None
        if 'topico' in assunto._data and assunto._data['topico']:
            # Get topico ID from DBRef without dereferencing
            topico_ref = assunto._data['topico']
            topico_id = topico_ref.id if hasattr(topico_ref, 'id') else topico_ref
            current_app.logger.info(f"Fetching topico {topico_id} from {db_alias} database")
            try:
                topico = Topico.objects.using(db_alias).get(id=topico_id)
                current_app.logger.info(f"Successfully fetched topico {topico.id}")
                topico_data = {
                    "id": str(topico.id),
                    "title": topico.title_en if use_english and hasattr(topico, 'title_en') and topico.title_en else topico.title
                }
                
                if 'participante' in topico._data and topico._data['participante']:
                    # Get participante ID from DBRef without dereferencing
                    participante_ref = topico._data['participante']
                    participante_id = participante_ref.id if hasattr(participante_ref, 'id') else participante_ref
                    current_app.logger.info(f"Fetching participante {participante_id} from {db_alias} database")
                    try:
                        participante = Participante.objects.using(db_alias).get(id=participante_id)
                        topico_data["participante"] = {
                            "id": str(participante.id),
                            "name": participante.name,
                            "role": participante.role if hasattr(participante, 'role') else None
                        }
                    except DoesNotExist:
                        current_app.logger.warning(f"Participante {participante_id} not found in {db_alias} database")
                        # If participante doesn't exist, just omit it
                        pass
                    except Exception as e:
                        current_app.logger.error(f"Error fetching participante: {str(e)}")
            except DoesNotExist:
                current_app.logger.warning(f"Topico {topico_id} not found in {db_alias} database")
                # If topico doesn't exist, just omit it
                pass
            except Exception as e:
                current_app.logger.error(f"Error fetching topico: {str(e)}")
                pass
            
        # Get municipio info once for reuse in vote processing
        municipio = None
        if 'municipio' in ata._data and ata._data['municipio']:
            # Get municipio ID from DBRef without dereferencing
            municipio_ref = ata._data['municipio']
            municipio_id = municipio_ref.id if hasattr(municipio_ref, 'id') else municipio_ref
            current_app.logger.info(f"Fetching municipio {municipio_id} from {db_alias} database")
            try:
                municipio = Municipio.objects.using(db_alias).get(id=municipio_id)
                current_app.logger.info(f"Successfully fetched municipio {municipio.id}")
            except DoesNotExist:
                current_app.logger.warning(f"Municipio {municipio_id} not found in {db_alias} database")
                pass
            except Exception as e:
                current_app.logger.error(f"Error fetching municipio: {str(e)}")
                pass
        
        # Get all votes
        votos_data = []
        if hasattr(assunto, 'votos') and assunto.votos:
            for voto in assunto.votos:
                try:
                    voto_data = {
                        "tipo": voto.tipo if hasattr(voto, 'tipo') else voto.tipo,
                        "timestamp": voto.timestamp.isoformat() if hasattr(voto, 'timestamp') and voto.timestamp else None
                    }
                    
                    # Add participante info if available
                    if hasattr(voto, 'participante') and voto.participante:
                        try:
                            # Get participante ID from DBRef without dereferencing
                            participante_id = voto.participante.id if hasattr(voto.participante, 'id') else voto.participante
                            participante = Participante.objects.using(db_alias).get(id=participante_id)
                            sort = None
                            role = None
                            party = None
                            for mandato in participante.mandatos:
                                if mandato.term_start and mandato.term_end:
                                    if mandato.term_start <= datetime.now(timezone.utc).year <= mandato.term_end:
                                        sort = mandato.sort if hasattr(mandato, 'sort') else None
                                        role = mandato.role_en if use_english and hasattr(mandato, 'role_en') and mandato.role_en else (mandato.role if hasattr(mandato, 'role') else None)
                                        party = mandato.party if hasattr(mandato, 'party') else None
                                        break
                                elif not mandato.term_start and not mandato.term_end:
                                    sort = None
                                    role = None
                                    party = None
                                    break
                            
                            voto_data["participante"] = {
                                "id": str(participante.id),
                                "name": participante.name,
                                "profile_photo": f"/uploads/participantes/{clean_name(municipio.name)}/{participante.image_filename}" 
                                    if municipio and hasattr(participante, 'image_filename') and participante.image_filename 
                                    else None,
                                "participante_type": participante.participante_type if hasattr(participante, 'participante_type') else None,
                                "role": role,
                                "sort": sort,
                                "party": party,
                            }
                        except DoesNotExist:
                            # If participante doesn't exist in the demo/target db, skip this vote's participante info
                            pass
                    
                    votos_data.append(voto_data)
                except Exception as e:
                    current_app.logger.warning(f"Error processing vote in assunto {assunto_id}: {str(e)}")
                    # Continue processing other votes even if one fails
                    
        # Build the result
        result = {
            "id": str(assunto.id),
            "title": assunto.title_en if use_english and hasattr(assunto, 'title_en') and assunto.title_en else (assunto.title if hasattr(assunto, 'title') else None),
            "deliberacao": assunto.deliberacao_en if use_english and hasattr(assunto, 'deliberacao_en') and assunto.deliberacao_en else (assunto.deliberacao if hasattr(assunto, 'deliberacao') else None),
            "summary": assunto.summary_en if use_english and hasattr(assunto, 'summary_en') and assunto.summary_en else (assunto.summary if hasattr(assunto, 'summary') else None),
            "aprovado": assunto.aprovado if hasattr(assunto, 'aprovado') else None,
            "votos_favor": assunto.votos_favor if hasattr(assunto, 'votos_favor') else 0,
            "votos_contra": assunto.votos_contra if hasattr(assunto, 'votos_contra') else 0,
            "abstencoes": assunto.abstencoes if hasattr(assunto, 'abstencoes') else 0,
            "data_votacao": assunto.data_votacao.isoformat() if hasattr(assunto, 'data_votacao') and assunto.data_votacao else None
        }
        
        # Add ata information
        if ata:
            result["ata"] = {
                "id": str(ata.id),
                "slug": ata.slug if hasattr(ata, 'slug') else None,
                "title": ata.title_en if use_english and hasattr(ata, 'title_en') and ata.title_en else (ata.title if hasattr(ata, 'title') else None),
                "date": ata.date.isoformat() if hasattr(ata, 'date') and ata.date else None,
                "file_url": f"/public/atas/{str(ata.id)}/view" if hasattr(ata, 'file_path') and ata.file_path else None
            }
            
            # Add municipio info if available (reuse already fetched municipio)
            if municipio:
                result["municipio"] = {
                    "id": str(municipio.id),
                    "slug": municipio.slug if hasattr(municipio, 'slug') else None,
                    "name": municipio.name_en if use_english and hasattr(municipio, 'name_en') and municipio.name_en else municipio.name,
                    "image": f"/uploads/municipios/{clean_name(municipio.name)}/{municipio.squared_image_filename}" if hasattr(municipio, 'squared_image_filename') and municipio.squared_image_filename else None
                }
        
        # Add topico information
        if topico_data:
            result["topico"] = topico_data
            
        # Add votos information
        result["votos"] = votos_data
        
        search_logger.info(
            f"auid={anon_user_id} | method=/assuntos/{assunto_id} | lang={lang} | position={position if position is not None else ''} | before_url={current_url if current_url is not None else ''} | assunto_title={assunto.title} | ata_id={str(ata.id)} | ata_title={ata.title if hasattr(ata, 'title') else None} | municipio={municipio.name if municipio else None} | topico_id={str(topico_data['id']) if topico_data else None} | aprovado={assunto.aprovado if hasattr(assunto, 'aprovado') else None} | votos_favor={assunto.votos_favor if hasattr(assunto, 'votos_favor') else 0} | votos_contra={assunto.votos_contra if hasattr(assunto, 'votos_contra') else 0} | abstencoes={assunto.abstencoes if hasattr(assunto, 'abstencoes') else 0} | total_votos={len(votos_data)}"
        )
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving assunto details: {str(e)}")
        return jsonify({"error": "Error retrieving assunto details"}), 500

@public_bp.route("/assuntos/<assunto_id>/votos", methods=["GET"])
def get_assunto_votos(assunto_id):
    """Get detailed voting information for a subject
    ---
    tags:
      - Public
      - Subjects
      - Voting
    description: Returns comprehensive voting information for a specific subject, including individual votes with participant details.
    parameters:
      - in: path
        name: assunto_id
        required: true
        schema:
          type: string
        description: Subject (subject) ID
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Voting details
        content:
          application/json:
            schema:
              type: object
              properties:
                assunto:
                  type: object
                summary:
                  type: object
                votos:
                  type: array
                  items:
                    type: object
                    properties:
                      participante:
                        type: object
                      voto:
                        type: string
      404:
        description: Subject not found
      400:
        description: Invalid subject ID
      500:
        description: Internal error
    """
    ip_address = request.remote_addr
    search_logger.info(f"ip={ip_address} | method=/assuntos/{assunto_id}/votos")

    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        assunto = Assunto.objects.using(db_alias).get(id=assunto_id)
        ata = assunto.ata
        
        # Check if ata is public
        if ata.status != "pending" and ata.status != "done":
            return jsonify({"error": "Assunto não disponível"}), 404
            
        # Prepare summary information+
        summary = {
            "total_votos": assunto.votos_favor + assunto.votos_contra + assunto.abstencoes,
            "votos_favor": assunto.votos_favor,
            "votos_contra": assunto.votos_contra,
            "abstencoes": assunto.abstencoes,
            "aprovado": assunto.aprovado,
            "data_votacao": assunto.data_votacao.isoformat() if hasattr(assunto, 'data_votacao') and assunto.data_votacao else None
        }
        
        # Get detailed vote information
        votos_detalhados = []
        if hasattr(assunto, 'votos') and assunto.votos:
            for voto in assunto.votos:
                voto_data = {
                    "tipo": voto.tipo,
                    "data": voto.data.isoformat() if voto.data else None,
                    "participante": {
                        "id": str(voto.participante.id),
                        "name": voto.participante.name,
                        "role": voto.participante.role,
                        "coalition": voto.participante.coalition if hasattr(voto.participante, 'coalition') else None,
                        "participante_type": voto.participante.participante_type if hasattr(voto.participante, 'participante_type') else None,
                        "profile_photo": f"/uploads/participantes/{clean_name(ata.municipio.name)}/{voto.participante.image_filename}" 
                            if hasattr(voto.participante, 'image_filename') and voto.participante.image_filename 
                            else None
                    } if voto.participante else None
                }
                votos_detalhados.append(voto_data)
                
        # Group votes by coalition if relevant
        coalition_summary = {}
        if votos_detalhados:
            for voto in votos_detalhados:
                if voto["participante"] and voto["participante"].get("coalition"):
                    coalition = voto["participante"]["coalition"]
                    if coalition not in coalition_summary:
                        coalition_summary[coalition] = {
                            "favor": 0,
                            "contra": 0,
                            "abstencao": 0
                        }
                    
                    if voto["tipo"] == "favor":
                        coalition_summary[coalition]["favor"] += 1
                    elif voto["tipo"] == "contra":
                        coalition_summary[coalition]["contra"] += 1
                    elif voto["tipo"] == "abstencao":
                        coalition_summary[coalition]["abstencao"] += 1
        
        return jsonify({
            "assunto": {
                "id": str(assunto.id),
                "title": assunto.title,
            },
            "ata": {
                "id": str(ata.id),
                "slug": ata.slug if hasattr(ata, 'slug') else None,
                "title": ata.title if hasattr(ata, 'title') else None,
                "date": ata.date.isoformat() if hasattr(ata, 'date') and ata.date else None
            },
            "summary": summary,
            "coalition_summary": coalition_summary,
            "votos": votos_detalhados
        }), 200
        
    except DoesNotExist:
        return jsonify({"error": "Assunto não encontrado"}), 404
    except ValidationError:
        return jsonify({"error": "ID de assunto inválido"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving voting details: {str(e)}")
        return jsonify({"error": f"Ocorreu um erro ao obter os detalhes da votação {str(e)}"}), 500


@public_bp.route("/municipios/<municipio_id>/atas/timeline", methods=["GET"])
def get_ata_timeline_overview(municipio_id):
    """Get timeline overview of atas for a municipality
    ---
    tags:
      - Public
      - City Council
      - Meeting Minutes
    description: Returns a chronological overview of all municipal meeting minutes for a specific city council.
    parameters:
      - in: path
        name: municipio_id
        required: true
        schema:
          type: string
        description: City council ID or slug
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Timeline of municipal meeting minutes
        content:
          application/json:
            schema:
              type: object
              properties:
                timeline:
                  type: array
                  items:
                    type: object
                    properties:
                      date:
                        type: string
                      atas:
                        type: array
      404:
        description: City council not found
      400:
        description: Invalid city council ID
      500:
        description: Internal error
    """
    ip_address = request.remote_addr
    search_logger.info(f"ip={ip_address} | method=/municipios/{municipio_id}/atas/timeline")

    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # Check if municipality exists
        if ObjectId.is_valid(municipio_id):
            municipio = Municipio.objects.using(db_alias).get(id=ObjectId(municipio_id))
        else:
            municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)
        
        limit = int(request.args.get("limit", 200))  
        
        # mais recente primeiro
        all_atas = Ata.objects(municipio=municipio).using(db_alias).only("id", "slug", "title", "date", "summary").order_by("-date").limit(limit)
        ata_ids = [ata.id for ata in all_atas]

        assuntos_raw = Assunto.objects(ata__in=ata_ids).using(db_alias).only("ata").as_pymongo()
        counts = defaultdict(int)
        for assunto in assuntos_raw:
            counts[assunto["ata"]] += 1

        # response data, só os atributos necessários para mostrar na timeline
        result = []
        for ata in all_atas:
            result.append({
                "id": str(ata.id),
                "slug": ata.slug,
                "title": ata.title,
                "date": ata.date.isoformat() if ata.date else None,
                "summary": ata.summary if hasattr(ata, 'summary') else None,
                "assuntos_count": counts.get(ata.id, 0),
            })
            
        metadata = {
            "total": len(result), 
            "municipio": {
                "id": str(municipio.id),
                "slug": municipio.slug if hasattr(municipio, 'slug') else None,
                "name": municipio.name
            }
        }
        
        return jsonify({
            "atas": result,
            "metadata": metadata
        }), 200
        
    except DoesNotExist:
        return jsonify({"error": "Municipality not found"}), 404
    except ValidationError:
        return jsonify({"error": "Invalid municipality ID"}), 400
    except Exception as e:
        current_app.logger.error(f"Error retrieving ata timeline overview: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@public_bp.route("/assuntos/search", methods=["GET"])
def search_assuntos():
    """Search for subjects (assuntos) with advanced filters
    ---
    tags:
      - Public
      - Subjects
      - Search
    description: Search subjects using keywords, filters, and advanced logic. Returns paginated results with voting information.
    parameters:
      - in: query
        name: q
        schema:
          type: string
        description: Keyword for full-text search
      - in: query
        name: municipio_id
        schema:
          type: string
        description: City council ID or slug
      - in: query
        name: topico
        schema:
          type: array
          items:
            type: string
        description: Filter by topic IDs or slugs
      - in: query
        name: topicos_logic
        schema:
          type: string
          enum: [and, or]
          default: or
        description: Logic for topic filter (AND/OR)
      - in: query
        name: aprovado
        schema:
          type: string
          enum: ["true", "false"]
        description: Filter by approval status
      - in: query
        name: start_date
        schema:
          type: string
          format: date
        description: Start date (YYYY-MM-DD)
      - in: query
        name: end_date
        schema:
          type: string
          format: date
        description: End date (YYYY-MM-DD)
      - in: query
        name: page
        schema:
          type: integer
          default: 1
        description: Page number
      - in: query
        name: per_page
        schema:
          type: integer
          default: 12
        description: Results per page
      - in: query
        name: sort
        schema:
          type: string
          default: date
        description: Sort field
      - in: query
        name: order
        schema:
          type: string
          enum: [asc, desc]
          default: desc
        description: Sort order
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Search results with pagination and facets
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    type: object
                pagination:
                  type: object
                applied_filters:
                  type: object
                facets:
                  type: object
      400:
        description: Invalid request or filter
      500:
        description: Internal error
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    ip_address = request.remote_addr
    search_logger.info(f"ip={ip_address} | auid={anon_user_id} | method=/assuntos/search")
    # send_telegram_message(text=f"ip={ip_address} | auid={anon_user_id} | method=/assuntos/search")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        keyword = request.args.get("q", "").strip()
        title = request.args.get("title", "").strip()
        municipio_id = request.args.get("municipio_id", "").strip()
        lang = request.args.get("lang", "pt").strip().lower()  # default to Portuguese
        
        search_logger.info(f"/assuntos/search called, query={keyword}, lang={lang}")
        
        topicos = []
        for topic_param in request.args.getlist("topico"):
            if ',' in topic_param:
                topicos.extend([t.strip() for t in topic_param.split(',') if t.strip()])
            elif topic_param.strip():
                topicos.append(topic_param.strip())
        participant_ids = []
        for participant_param in request.args.getlist("participant_id"):
            if ',' in participant_param:
                participant_ids.extend([p.strip() for p in participant_param.split(',') if p.strip()])
            elif participant_param.strip():
                participant_ids.append(participant_param.strip())
        aprovado = request.args.get("aprovado")
        start_date = request.args.get("start_date", "").strip()
        end_date = request.args.get("end_date", "").strip()
        party = request.args.get("party", "").strip()
        
        # pagination
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 12, type=int)
        
        # sorting
        sort_by = request.args.get("sort", "date")
        sort_order = request.args.get("order", "desc")
        
        # base query
        base_query = {}
        ata_ids = None
        
        if title:
            base_query["title__icontains"] = title
            
        if topicos:
            topico_ids = []
            for topico in topicos:
                if ObjectId.is_valid(topico):
                    topico_ids.append(ObjectId(topico))
                else:
                    try:
                        topico_obj = Topico.objects.using(db_alias).get(slug=topico)
                        topico_ids.append(topico_obj.id)
                    except DoesNotExist:
                        current_app.logger.warning(f"Topico with slug '{topico}' not found in {db_alias} database")
                        continue
            
            if topico_ids:
                base_query["topico__in"] = topico_ids
            
        if aprovado is not None and aprovado.strip():
            search_logger.info(f"Filtering by aprovado: {aprovado}")
            base_query["aprovado"] = aprovado.lower() == "true"
        
        if municipio_id:
            try:
                if ObjectId.is_valid(municipio_id):
                    atas = Ata.objects(municipio=municipio_id).using(db_alias).only('id')
                else:
                    municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)
                    atas = Ata.objects(municipio=municipio.id).using(db_alias).only('id')
                
                ata_ids = [ata.id for ata in atas]
                if not ata_ids:
                    current_app.logger.info(f"No atas found for municipio_id: {municipio_id}")
                    search_logger.info(
                        f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                    )
                    return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
                
                base_query["ata__in"] = ata_ids
            except (DoesNotExist, ValidationError):
                current_app.logger.warning(f"Invalid municipio_id: {municipio_id}")
                search_logger.info(
                    f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0 | error=invalid_municipio_id"
                )
                return jsonify({"error": "Invalid or non-existent municipio_id"}), 400
        
        if participant_ids:
            try:
                all_participant_assunto_ids = set()
                first_participant = True
                
                for participant_id in participant_ids:
                    try:
                        if not ObjectId.is_valid(participant_id):
                            continue
                        
                        participant_id_obj = ObjectId(participant_id)
                        pipeline = [
                            {"$match": {"votos.participante": participant_id_obj}},
                            {"$project": {"_id": 1}}
                        ]
                        
                        participant_assunto_ids = [doc["_id"] for doc in Assunto.objects.using(db_alias).aggregate(*pipeline)]
                        
                        if not participant_assunto_ids:
                            continue 
                        if first_participant:
                            all_participant_assunto_ids = set(participant_assunto_ids)
                            first_participant = False
                        else:
                            all_participant_assunto_ids.update(participant_assunto_ids)
                    except Exception as e:
                        current_app.logger.warning(f"Error processing participant_id {participant_id}: {str(e)}")
                        continue
                
                if not all_participant_assunto_ids:
                    current_app.logger.info("No assuntos found for the provided participant_ids")
                    search_logger.info(
                        f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                    )
                    return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
                    
                if "id__in" in base_query:
                    existing_ids = set(base_query["id__in"])
                    filtered_ids = existing_ids.intersection(all_participant_assunto_ids)
                    if not filtered_ids:
                        search_logger.info("No assuntos found after participant intersection")
                        search_logger.info(
                            f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                        )
                        return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
                    base_query["id__in"] = list(filtered_ids)
                else:
                    base_query["id__in"] = list(all_participant_assunto_ids)
            except Exception as e:
                search_logger.error(f"Error processing participant filters: {str(e)}")
                search_logger.info(
                    f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0 | error=participant_filter_error"
                )
                return jsonify({"error": f"Invalid or non-existent participant_id: {str(e)}"}), 400
        
        if party:
            try:
                party_participants = Participante.objects(mandatos__match={'party__iexact': party}).using(db_alias).only('id')
                if not party_participants:
                    search_logger.info(f"No participants found for party: {party}")
                    return jsonify({
                        "data": [], 
                        "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}, 
                        "applied_filters": {
                            "keyword": keyword, "title": title, "municipio_id": municipio_id,
                            "topico_id": topicos, "participant_id": participant_ids, 
                            "party": party, "aprovado": aprovado,
                            "start_date": start_date, "end_date": end_date,
                            "sort_by": sort_by, "sort_order": sort_order
                        }
                    }), 200
                
                participant_ids_list = [participant.id for participant in party_participants]
                search_logger.info(f"Found {len(participant_ids_list)} participants for party: {party}")

                party_assunto_ids = set()
                pipeline = [
                    {"$match": {"votos.participante": {"$in": participant_ids_list}}},
                    {"$project": {"_id": 1}}
                ]
                
                party_assunto_ids = {doc["_id"] for doc in Assunto.objects.using(db_alias).aggregate(*pipeline)}
                search_logger.info(f"Found {len(party_assunto_ids)} assuntos for party: {party}")
                
                if party_assunto_ids:
                    if "id__in" in base_query:
                        # intersection
                        existing_ids = set(base_query["id__in"])
                        filtered_ids = existing_ids.intersection(party_assunto_ids)
                        if not filtered_ids:
                            search_logger.info(f"No assuntos found for party: {party}")
                            return jsonify({
                                "data": [], 
                                "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}, 
                                "applied_filters": {
                                    "keyword": keyword, "title": title, "municipio_id": municipio_id,
                                    "topico_id": topicos, "participant_id": participant_ids, 
                                    "party": party, "aprovado": aprovado,
                                    "start_date": start_date, "end_date": end_date, 
                                    "sort_by": sort_by, "sort_order": sort_order
                                }
                            }), 200
                        base_query["id__in"] = list(filtered_ids)
                        search_logger.info(f"Filtered assuntos for party: {party} to {len(filtered_ids)}")
                    else:
                        base_query["id__in"] = list(party_assunto_ids)
                        search_logger.info(f"Filtered assuntos for party: {party} to {len(party_assunto_ids)}")
                else:
                    search_logger.info(f"No assuntos found for party: {party}")
                    return jsonify({
                        "data": [], 
                        "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}, 
                        "applied_filters": {
                            "keyword": keyword, "title": title, "municipio_id": municipio_id,
                            "topico_id": topicos, "participant_id": participant_ids, 
                            "party": party, "aprovado": aprovado,
                            "start_date": start_date, "end_date": end_date, 
                            "sort_by": sort_by, "sort_order": sort_order
                        }
                    }), 200
            except Exception as e:
                current_app.logger.error(f"Party filter error: {str(e)}")
                return jsonify({"error": f"Error processing party filter: {str(e)}"}), 400
        
        # date filters
        start_datetime = end_datetime = None
        
        if start_date or end_date:
            date_query = {}
            
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                    start_datetime = datetime.combine(start_date_obj, time.min, tzinfo=timezone.utc)
                    date_query["date__gte"] = start_datetime
                except ValueError:
                    search_logger.error(f"Invalid start_date format: {start_date}")
                    search_logger.info(
                        f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0 | error=invalid_start_date"
                    )
                    return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
                    
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                    end_datetime = datetime.combine(end_date_obj, time.max, tzinfo=timezone.utc)
                    date_query["date__lt"] = end_datetime
                except ValueError:
                    search_logger.error(f"Invalid end_date format: {end_date}")
                    search_logger.info(
                        f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0 | error=invalid_end_date"
                    )
                    return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
            
            # Get atas matching the date criteria
            date_atas = Ata.objects(**date_query).using(db_alias).only('id')
            date_ata_ids = [ata.id for ata in date_atas]
            
            if not date_ata_ids:
                # No atas match the date criteria
                search_logger.info("No atas found matching date criteria")
                search_logger.info(
                    f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                )
                return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
                
            if "ata__in" in base_query:
                # Intersect with existing ata filter
                base_query["ata__in"] = [id for id in base_query["ata__in"] if id in date_ata_ids]
                if not base_query["ata__in"]:
                    search_logger.info("No atas found after date intersection")
                    search_logger.info(
                        f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                    )
                    return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
            else:
                base_query["ata__in"] = date_ata_ids
        

        # keyword search
        highlights_map = {}        
        if keyword:
            try:
                # saving the query keyword on the database
                Query.objects(query=keyword).using(db_alias).update_one(
                    set__last_seen=datetime.now(),
                    inc__count=1,
                    set_on_insert__first_seen=datetime.now(),
                    upsert=True
                )

                assuntos_collection = Assunto.objects.using(db_alias)
                
                # separate pipelines for Portuguese and English search
                if lang == "en":
                    search_pipeline = [
                        {
                            "$search": {
                                "index": "assuntos_search_en",
                                "compound": {
                                    "should": [
                                        {
                                            "phrase": {
                                                "query": keyword,
                                                "path": ["title_en", "summary_en", "deliberacao_en"],
                                                "slop": 0,
                                                "score": {"boost": {"value": 50}}
                                            }
                                        },
                                        {
                                            "text": {
                                                "query": keyword,
                                                "path": "title_en",
                                                "score": {"boost": {"value": 15}},
                                                "matchCriteria": "all"
                                            }
                                        },
                                        {
                                            "text": {
                                                "query": keyword,
                                                "path": "deliberacao_en",
                                                "score": {"boost": {"value": 12}},
                                                "matchCriteria": "all"
                                            }
                                        },
                                        {
                                            "text": {
                                                "query": keyword,
                                                "path": "summary_en",
                                                "score": {"boost": {"value": 10}},
                                                "matchCriteria": "all"
                                            }
                                        }
                                    ],
                                    "minimumShouldMatch": 1
                                },
                                "highlight": {
                                    "path": ["title_en", "summary_en", "deliberacao_en"]
                                }
                            }
                        },
                        {
                            "$project": {
                                "_id": 1,
                                "score": {"$meta": "searchScore"},
                                "highlights": {"$meta": "searchHighlights"}
                            }
                        },
                        {"$sort": {"score": -1}}
                    ]
                else:
                    search_pipeline = [
                        {
                            "$search": {
                                "index": "assuntos_search",
                                "compound": {
                                    "should": [
                                        {
                                            "phrase": {
                                                "query": keyword,
                                                "path": ["title", "summary", "deliberacao"],
                                                "slop": 0,
                                                "score": {"boost": {"value": 40}}
                                            }
                                        },
                                        {
                                            "text": {
                                                "query": keyword,
                                                "path": "title",
                                                "score": {"boost": {"value": 12}},
                                                "matchCriteria": "all"
                                            }
                                        },
                                        {
                                            "text": {
                                                "query": keyword,
                                                "path": "deliberacao",
                                                "score": {"boost": {"value": 10}},
                                                "matchCriteria": "all"
                                            }
                                        },
                                        {
                                            "text": {
                                                "query": keyword,
                                                "path": "summary",
                                                "score": {"boost": {"value": 8}},
                                                "matchCriteria": "all"
                                            }
                                        }
                                    ],
                                    "minimumShouldMatch": 1
                                },
                                "highlight": {
                                    "path": ["title", "summary", "deliberacao"]
                                }
                            }
                        },
                        {
                            "$project": {
                                "_id": 1,
                                "score": {"$meta": "searchScore"},
                                "highlights": {"$meta": "searchHighlights"}
                            }
                        },
                        {"$sort": {"score": -1}}
                    ]
                

                search_logger.info(f"Base query filters to apply post-search: {base_query}")
                search_results = list(assuntos_collection.aggregate(search_pipeline))
                search_logger.info(f"Search found {len(search_results)} results for keyword: {keyword}")
                search_logger.info(f"Base query filters before search: {base_query}")
                assunto_ids = [res["_id"] for res in search_results]
                
                # Create a mapping of assunto_id to highlights and score for later use
                highlights_map = {str(res["_id"]): {
                    "highlights": res.get("highlights", []),
                    "score": res.get("score", 0)
                } for res in search_results}
                
                if not assunto_ids:
                    # No search results
                    search_logger.info("No search results found for keyword")
                    search_logger.info(
                        f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                    )
                    return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
                
                # Apply keyword search results to existing filters
                if "id__in" in base_query:
                    existing_ids = set(base_query["id__in"])
                    filtered_ids = [id for id in assunto_ids if id in existing_ids]
                    if not filtered_ids:
                        search_logger.info("No search results found after keyword intersection")
                        search_logger.info(
                            f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0"
                        )
                        return jsonify({"data": [], "pagination": {"total": 0, "page": page, "per_page": per_page, "pages": 0}}), 200
                    base_query["id__in"] = filtered_ids
                else:
                    base_query["id__in"] = assunto_ids
            except Exception as search_error:
                current_app.logger.error(f"Search index error: {search_error}")
                if keyword:
                    pass
                highlights_map = {}
        
        # query with the base filters
        query = Assunto.objects(**base_query).using(db_alias)
        
        # if keyword and not highlights_map:
        #     query = query.filter(
        #         Q(title__icontains=keyword) | 
        #         Q(summary__icontains=keyword) |
        #         Q(deliberacao__icontains=keyword)
        #     )
        
        facets = {}
        try:
            # Get IDs for facet generation - always generate facets, not just when base_query exists
            if base_query:
                facet_query = Assunto.objects(**base_query).using(db_alias)
                if keyword and not highlights_map:
                    facet_query = facet_query.filter(
                        Q(title__icontains=keyword) | 
                        Q(summary__icontains=keyword) |
                        Q(deliberacao__icontains=keyword)
                    )
                facet_ids = [assunto.id for assunto in facet_query.only('id')]
            else:
                # When no filters applied, generate facets for all assuntos
                facet_query = Assunto.objects().using(db_alias)
                if keyword and not highlights_map:
                    facet_query = facet_query.filter(
                        Q(title__icontains=keyword) | 
                        Q(summary__icontains=keyword) |
                        Q(deliberacao__icontains=keyword)
                    )
                facet_ids = [assunto.id for assunto in facet_query.only('id')]
                
            if facet_ids:
                    assuntos_collection = Assunto.objects.using(db_alias)
                    facet_pipeline = [
                        {"$match": {"_id": {"$in": facet_ids}}},
                        {"$lookup": {
                            "from": "ata",
                            "localField": "ata",
                            "foreignField": "_id",
                            "as": "ata_data"
                        }},
                        {"$unwind": "$ata_data"},
                        {"$facet": {
                            "topicos": [
                                {"$group": {"_id": "$topico", "count": {"$sum": 1}}},
                                {"$sort": {"count": -1}}
                            ],
                            "municipios": [
                                {"$group": {"_id": "$ata_data.municipio", "count": {"$sum": 1}}},
                                {"$sort": {"count": -1}}
                            ],
                            "aprovado": [
                                {"$group": {"_id": "$aprovado", "count": {"$sum": 1}}},
                                {"$sort": {"count": -1}}
                            ],
                            "years": [
                                {"$addFields": {"year": {"$year": "$ata_data.date"}}},
                                {"$group": {"_id": "$year", "count": {"$sum": 1}}},
                                {"$sort": {"_id": -1}}
                            ],
                            "participants": [
                                {"$unwind": "$votos"},
                                {"$group": {"_id": "$votos.participante", "count": {"$sum": 1}}},
                                {"$sort": {"count": -1}}
                            ],
                             "parties": [
                                {"$unwind": "$votos"},
                                {"$lookup": {
                                    "from": "participante",
                                    "localField": "votos.participante",
                                    "foreignField": "_id",
                                    "as": "participante_info"
                                }},
                                {"$unwind": "$participante_info"},
                                {"$unwind": "$participante_info.mandatos"},
                                {"$group": {
                                    "_id": {
                                        "assunto_id": "$_id",
                                        "party": "$participante_info.mandatos.party"
                                    }
                                }},
                                {"$group": {
                                    "_id": "$_id.party",
                                    "count": {"$sum": 1}
                                }},
                                {"$match": {
                                    "_id": {"$ne": None}
                                }},
                                {"$sort": {"count": -1}}
                            ]
                        }}
                    ]
                    
                    facet_results = list(assuntos_collection.aggregate(facet_pipeline))
                    if facet_results:
                        facets = facet_results[0]
                        
                        # Process topicos facet with language support
                        if "topicos" in facets:
                            topico_ids = [
                                ObjectId(item["_id"]) 
                                for item in facets["topicos"] 
                                if isinstance(item["_id"], ObjectId)
                            ]
                            # Fetch both title and title_en fields for translation support
                            topicos_with_lang = Topico.objects(id__in=topico_ids).using(db_alias).only("id", "title", "title_en")
                            topico_map = {}
                            for t in topicos_with_lang:
                                # Store both language versions for frontend translation
                                topico_map[str(t.id)] = {
                                    "title": t.title,
                                    "title_en": t.title_en if hasattr(t, 'title_en') else None
                                }
                            
                            for item in facets["topicos"]:
                                if isinstance(item["_id"], ObjectId):
                                    item["_id"] = str(item["_id"])
                                    topico_data = topico_map.get(item["_id"], {"title": "Desconhecido" if lang == 'pt' else "Unknown", "title_en": None})
                                    item["title"] = topico_data["title"]
                                    item["title_en"] = topico_data["title_en"]
                        
                        # Process municipios facet with language support
                        if "municipios" in facets:
                            municipio_ids = [
                                ObjectId(item["_id"]) 
                                for item in facets["municipios"] 
                                if isinstance(item["_id"], ObjectId)
                            ]
                            # Fetch both name and name_en fields for translation support
                            municipios_with_lang = Municipio.objects(id__in=municipio_ids).using(db_alias).only("id", "name", "name_en")
                            municipio_map = {}
                            for m in municipios_with_lang:
                                # Store both language versions for frontend translation
                                municipio_map[str(m.id)] = {
                                    "name": m.name,
                                    "name_en": m.name_en if hasattr(m, 'name_en') else None
                                }
                            
                            for item in facets["municipios"]:
                                if isinstance(item["_id"], ObjectId):
                                    item["_id"] = str(item["_id"])
                                    municipio_data = municipio_map.get(item["_id"], {"name": "Desconhecido" if lang == 'pt' else "Unknown", "name_en": None})
                                    item["name"] = municipio_data["name"]
                                    item["name_en"] = municipio_data["name_en"]

                        if "participants" in facets:
                            participant_ids_facets = [
                                ObjectId(item["_id"]) 
                                for item in facets["participants"] 
                                if isinstance(item["_id"], ObjectId)
                            ]
                            # Participant names typically don't need translation, but keeping consistent structure
                            participant_map = {str(p.id): {"name": p.name, "name_en": None} for p in Participante.objects(id__in=participant_ids_facets).using(db_alias).only("id", "name")}
                            for item in facets["participants"]:
                                if isinstance(item["_id"], ObjectId):
                                    item["_id"] = str(item["_id"])
                                    participant_data = participant_map.get(item["_id"], {"name": "Desconhecido", "name_en": None})
                                    item["name"] = participant_data["name"]
                                    item["name_en"] = participant_data["name_en"]

                        if "parties" in facets:
                            # No need for mapping since parties facet now contains the actual party names
                            for item in facets["parties"]:
                                if item["_id"] is None:
                                    item["_id"] = "Sem Partido"
                                # The party name is already in _id, no need for additional name field
                        
                        # Add date presets as facets - more efficiently using aggregation
                        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                        
                        # Calculate these dates once
                        last_week = today - timedelta(days=7)
                        last_month = today - timedelta(days=30)
                        last_quarter = today - timedelta(days=90)
                        last_year = today - timedelta(days=365)
                        
                        # Use MongoDB aggregation for better performance
                        date_pipeline = [
                            {"$match": {"_id": {"$in": facet_ids}}},
                            {"$lookup": {
                                "from": "ata",
                                "localField": "ata",
                                "foreignField": "_id",
                                "as": "ata_data"
                            }},
                            {"$unwind": "$ata_data"},
                            {"$facet": {
                                "last_week": [
                                    {"$match": {"ata_data.date": {"$gte": last_week}}},
                                    {"$count": "count"}
                                ],
                                "last_month": [
                                    {"$match": {"ata_data.date": {"$gte": last_month}}},
                                    {"$count": "count"}
                                ],
                                "last_quarter": [
                                    {"$match": {"ata_data.date": {"$gte": last_quarter}}},
                                    {"$count": "count"}
                                ],
                                "last_year": [
                                    {"$match": {"ata_data.date": {"$gte": last_year}}},
                                    {"$count": "count"}
                                ],
                                "all_time": [
                                    {"$count": "count"}
                                ]
                            }}
                        ]
                        
                        date_results = list(assuntos_collection.aggregate(date_pipeline))
                        
                        if date_results and date_results[0]:
                            date_counts = date_results[0]
                            # Language-specific labels for date presets
                            if lang == 'en':
                                facets["date_presets"] = [
                                    {"_id": "all", "label": "All Time", 
                                     "count": date_counts.get("all_time", [{"count": 0}])[0].get("count", 0) if date_counts.get("all_time") else len(facet_ids)},
                                    {"_id": "last_week", "label": "Last Week", 
                                     "count": date_counts.get("last_week", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_week") else 0},
                                    {"_id": "last_month", "label": "Last Month", 
                                     "count": date_counts.get("last_month", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_month") else 0},
                                    {"_id": "last_quarter", "label": "Last Quarter", 
                                     "count": date_counts.get("last_quarter", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_quarter") else 0},
                                    {"_id": "last_year", "label": "Last Year", 
                                     "count": date_counts.get("last_year", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_year") else 0},
                                    {"_id": "custom", "label": "Custom Period", "count": 0}
                                ]
                            else:  # Portuguese
                                facets["date_presets"] = [
                                    {"_id": "all", "label": "Todos os Períodos", 
                                     "count": date_counts.get("all_time", [{"count": 0}])[0].get("count", 0) if date_counts.get("all_time") else len(facet_ids)},
                                    {"_id": "last_week", "label": "Última Semana", 
                                     "count": date_counts.get("last_week", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_week") else 0},
                                    {"_id": "last_month", "label": "Último Mês", 
                                     "count": date_counts.get("last_month", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_month") else 0},
                                    {"_id": "last_quarter", "label": "Último Trimestre", 
                                     "count": date_counts.get("last_quarter", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_quarter") else 0},
                                    {"_id": "last_year", "label": "Último Ano", 
                                     "count": date_counts.get("last_year", [{"count": 0}])[0].get("count", 0) if date_counts.get("last_year") else 0},
                                    {"_id": "custom", "label": "Período Personalizado", "count": 0}
                                ]
                        else:
                            # Fallback if aggregation failed
                            if lang == 'en':
                                facets["date_presets"] = [
                                    {"_id": "all", "label": "All Time", "count": len(facet_ids)},
                                    {"_id": "last_week", "label": "Last Week", "count": 0},
                                    {"_id": "last_month", "label": "Last Month", "count": 0},
                                    {"_id": "last_quarter", "label": "Last Quarter", "count": 0},
                                    {"_id": "last_year", "label": "Last Year", "count": 0},
                                    {"_id": "custom", "label": "Custom Period", "count": 0}
                                ]
                            else:  # Portuguese
                                facets["date_presets"] = [
                                    {"_id": "all", "label": "Todos os Períodos", "count": len(facet_ids)},
                                    {"_id": "last_week", "label": "Última Semana", "count": 0},
                                    {"_id": "last_month", "label": "Último Mês", "count": 0},
                                    {"_id": "last_quarter", "label": "Último Trimestre", "count": 0},
                                    {"_id": "last_year", "label": "Último Ano", "count": 0},
                                    {"_id": "custom", "label": "Período Personalizado", "count": 0}
                                ]
            else:
                # No facet_ids available, set empty facets
                facets = {"topicos": [], "municipios": [], "aprovado": [], "years": [], "participants": [], "parties": [], "date_presets": []}

        except Exception as facet_error:
            current_app.logger.error(f"Facet generation error in search_assuntos: {facet_error}")
            facets = {"topicos": [], "municipios": [], "aprovado": [], "years": [], "participants": [], "parties": [], "date_presets": []}
        
        # sorting is different because the assunto object does not contain the date attributes, they are only present in the ata object
        date_sort_fields = ['date', 'start_datetime', 'end_datetime']
        needs_ata_join = sort_by in date_sort_fields

        if needs_ata_join:
            assuntos_collection = Assunto.objects.using(db_alias)
            
            # Build the base match stage
            match_stage = {}
            for key, value in base_query.items():
                if key == "title__icontains":
                    match_stage["title"] = {"$regex": value, "$options": "i"}
                elif "__" in key:
                    field, op = key.split("__", 1)
                    if field == "id":
                        field = "_id"
                    if op == "in":
                        match_stage[field] = {"$in": value}
                    elif op == "icontains":
                        match_stage[field] = {"$regex": value, "$options": "i"}
                else:
                    mongo_field = "_id" if key == "id" else key
                    match_stage[mongo_field] = value
            
            # Build aggregation pipeline
            pipeline = [
                {"$match": match_stage} if match_stage else {"$match": {}},
                {
                    "$lookup": {
                        "from": "ata",
                        "localField": "ata",
                        "foreignField": "_id",
                        "as": "ata_data"
                    }
                },
                {"$unwind": "$ata_data"},
                {
                    "$sort": {
                        f"ata_data.{sort_by}": 1 if sort_order.lower() == "asc" else -1
                    }
                },
                {"$skip": (page - 1) * per_page},
                {"$limit": per_page}
            ]
            
            # Get total count first
            count_pipeline = [
                {"$match": match_stage} if match_stage else {"$match": {}},
                {"$count": "total"}
            ]
            
            search_logger.info(f"DEBUG: Executing count aggregation pipeline: {count_pipeline}")
            count_result = list(assuntos_collection.aggregate(count_pipeline))
            total_assuntos = count_result[0]["total"] if count_result else 0
            search_logger.info(f"DEBUG: Count result: {total_assuntos}")
            
            # Get the sorted results
            search_logger.info(f"DEBUG: Executing main aggregation pipeline: {pipeline}")
            aggregation_results = list(assuntos_collection.aggregate(pipeline))
            search_logger.info(f"DEBUG: Aggregation returned {len(aggregation_results)} results")
            
            # Convert back to MongoEngine objects
            assunto_ids = [ObjectId(result["_id"]) for result in aggregation_results]
            assuntos_dict = {str(assunto.id): assunto for assunto in Assunto.objects(id__in=assunto_ids).using(db_alias)}
            
            # Maintain the sorted order from aggregation
            assuntos = [assuntos_dict[str(assunto_id)] for assunto_id in assunto_ids if str(assunto_id) in assuntos_dict]
            
        else:
            # use of regular sorting
            sort_prefix = "" if sort_order.lower() == "asc" else "-"
            sort_field = f"{sort_prefix}{sort_by}"
            total_assuntos = query.count()
            assuntos = query.order_by(sort_field).allow_disk_use(enabled=True).skip((page - 1) * per_page).limit(per_page)
            

        # Format results
        results = []
        
        for index, assunto in enumerate(assuntos):
            try:
                position = (page - 1) * per_page + index + 1

                # Access the raw DBRef ID without triggering dereferencing
                ata = None
                topico = None
                
                try:
                    # Get the raw ata DBRef ID from the assunto object
                    ata_ref = assunto._data.get('ata')  # This gets the raw DBRef without dereferencing
                    if ata_ref:
                        ata_id = ata_ref.id if hasattr(ata_ref, 'id') else ata_ref
                        ata = Ata.objects(id=ata_id).using(db_alias).first()
                except Exception as ata_error:
                    search_logger.error(f"Error fetching ata: {ata_error}")
                    ata = None
                
                try:
                    # Get the raw topico DBRef ID from the assunto object
                    topico_ref = assunto._data.get('topico')  # This gets the raw DBRef without dereferencing
                    if topico_ref:
                        topico_id = topico_ref.id if hasattr(topico_ref, 'id') else topico_ref
                        topico = Topico.objects(id=topico_id).using(db_alias).first()
                except Exception as topico_error:
                    search_logger.error(f"Error fetching topico: {topico_error}")
                    topico = None
                
                assunto_id_str = str(assunto.id)
            
                # Build ata data safely with language support
                ata_data = None
                if ata:
                    try:
                        # Handle municipio reference with correct db_alias
                        municipio = None
                        if ata.municipio:
                            try:
                                municipio = Municipio.objects(id=ata.municipio.id).using(db_alias).first()
                            except Exception as municipio_error:
                                search_logger.error(f"DEBUG: Error fetching municipio: {municipio_error}")
                        
                        # Include both language versions for frontend translation
                        ata_data = {
                            "id": str(ata.id),
                            "slug": ata.slug,
                            "human_validated": ata.human_validated if hasattr(ata, 'human_validated') else None,
                            "title": ata.title,
                            "title_en": ata.title_en if hasattr(ata, 'title_en') else None,
                            "date": ata.date.isoformat() if ata.date else None,
                            "start_hour": ata.start_datetime.strftime("%H:%M") if ata.start_datetime else None,
                            "end_hour": ata.end_datetime.strftime("%H:%M") if ata.end_datetime else None,
                            "municipio": municipio.name if municipio else None,
                            "municipio_en": municipio.name_en if (municipio and hasattr(municipio, 'name_en')) else None,
                            "municipio_id": str(municipio.id) if municipio else None,
                        }
                    except Exception as ata_data_error:
                        search_logger.error(f"Error building ata data: {ata_data_error}")
                        ata_data = None

                # No need to select language-specific fields here, return both versions for frontend translation
                
                # Include both language versions for topico for frontend translation
                topico_data = None
                if topico:
                    topico_data = {
                        "id": str(topico.id),
                        "title": topico.title,
                        "title_en": topico.title_en if hasattr(topico, 'title_en') else None,
                    }

                result_data = {
                    "id": assunto_id_str,
                    "title": assunto.title,
                    "title_en": assunto.title_en if hasattr(assunto, 'title_en') else None,
                    "deliberacao": assunto.deliberacao if hasattr(assunto, 'deliberacao') else None,
                    "deliberacao_en": assunto.deliberacao_en if hasattr(assunto, 'deliberacao_en') else None,
                    "summary": assunto.summary if hasattr(assunto, 'summary') else None,
                    "summary_en": assunto.summary_en if hasattr(assunto, 'summary_en') else None,
                    "aprovado": assunto.aprovado,
                    "votos_favor": assunto.votos_favor,
                    "votos_contra": assunto.votos_contra,
                    "abstencoes": assunto.abstencoes,
                    "position": position,
                    "ata": ata_data,
                    "topico": topico_data
                }
                
                # Add participant's vote if viewing from a specific participant's page
                if participant_ids and len(participant_ids) == 1:
                    try:
                        # Get the participant's vote from the votos list
                        participant_id_to_check = participant_ids[0]
                        if ObjectId.is_valid(participant_id_to_check):
                            participant_oid = ObjectId(participant_id_to_check)
                        else:
                            # Try to get participant by slug
                            try:
                                participant_obj = Participante.objects.using(db_alias).get(slug=participant_id_to_check)
                                participant_oid = participant_obj.id
                            except DoesNotExist:
                                participant_oid = None
                        
                        if participant_oid and hasattr(assunto, 'votos') and assunto.votos:
                            for voto in assunto.votos:
                                if hasattr(voto, 'participante') and voto.participante.id == participant_oid:
                                    result_data["participante_voto"] = voto.tipo
                                    break
                    except Exception as vote_error:
                        search_logger.error(f"Error getting participant vote: {vote_error}")

                # Add highlights if available
                if keyword and assunto_id_str in highlights_map:
                    result_data["highlights"] = highlights_map[assunto_id_str]["highlights"]
                
                results.append(result_data)
                
            except Exception as format_error:
                search_logger.error(f"Error formatting assunto {index} (id: {assunto.id if hasattr(assunto, 'id') else 'unknown'}): {str(format_error)}")
                # Skip this result and continue with next one
                continue
        
        pagination = { "total": total_assuntos, "page": page, "per_page": per_page, "pages": (total_assuntos + per_page - 1) // per_page}

        start_date_str = start_datetime.isoformat() if start_datetime else None
        end_date_str = end_datetime.isoformat() if end_datetime else None
        
        search_logger.info(
            f"ip={ip_address} | auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date_str} | end_date={end_date_str} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results={pagination['total']}"
        )
        # send_telegram_message(
        #     text=f"ip={ip_address} | auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date_str} | end_date={end_date_str} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results={pagination['total']}"
        # )
            
        return jsonify({
            "anon_user_id": anon_user_id,
            "data": results,
            "pagination": pagination,
            "applied_filters": {
                "keyword": keyword,
                "title": title,
                "municipio_id": municipio_id,
                "topico_id": topicos,
                "participant_id": participant_ids,
                "party": party,
                "aprovado": aprovado,
                "start_date": start_date,
                "end_date": end_date,
                "sort_by": sort_by,
                "sort_order": sort_order
            },
            "facets": facets
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        current_app.logger.error(f"Public search assuntos error: {str(e)}")
        current_app.logger.error(f"Full traceback: {error_traceback}")
        
        # Try to log search parameters even when there's an error
        try:
            search_logger.info(
                f"auid={anon_user_id} | method=/assuntos/search | query={keyword} | title={title} | municipio_id={municipio_id} | participant_ids={participant_ids} | party={party} | topicos={topicos} | aprovado={aprovado} | start_date={start_date} | end_date={end_date} | sort_by={sort_by} | sort_order={sort_order} | page={page} | per_page={per_page} | total_results=0 | error=exception"
            )
        except:
            pass  # If even logging fails, don't crash
        return jsonify({"error": f"Error processing search: {str(e)}", "traceback": error_traceback}), 500

@public_bp.route("/topicos", methods=["GET"])
def get_all_topicos():
    """Get list of all topics
    ---
    tags:
      - Public
      - Topics
    description: Returns a list of all topics available in the system.
    parameters:
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: List of topics
        content:
          application/json:
            schema:
              type: object
              properties:
                topicos:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: string
                      title:
                        type: string
                      slug:
                        type: string
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        topicos = Topico.objects().using(db_alias)

        results = []
        for topico in topicos:
            topico_data = {
                "id": str(topico.id),
                "name": topico.title,
                "name_en": topico.title_en if hasattr(topico, 'title_en') else None,
            }
            results.append(topico_data)
            
        return jsonify(results), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving topicos: {str(e)}")
        return jsonify({"error": "Ocorreu um erro ao obter os tópicos"}), 500


@public_bp.route("/participantes/<participante_id>/info", methods=["GET"])
def participante_info_endpoint(participante_id: str):
    """Get information about a participant
    ---
    tags:
      - Public
      - Participantes
    description: Returns general information about a specific participant including their role and party affiliation.
    parameters:
      - in: path
        name: participante_id
        required: true
        schema:
          type: string
        description: Participant ID
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Participant information
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                slug:
                  type: string
                role:
                  type: string
                party:
                  type: string
                image:
                  type: string
      404:
        description: Participant not found
      400:
        description: Invalid participant ID
    """
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        if not ObjectId.is_valid(participante_id):
            participante = Participante.objects.using(db_alias).get(slug=participante_id)
        else:
            participante = Participante.objects.using(db_alias).get(id=participante_id)
        
        total_atas = Ata.objects(participantes=participante).using(db_alias).count()
        
        pipeline = [
            {"$match": {"votos.participante": participante.id}},
            {"$count": "total_assuntos"}
        ]
        assuntos_collection = Assunto.objects.using(db_alias)
        assuntos_result = list(assuntos_collection.aggregate(pipeline))
        total_assuntos = assuntos_result[0]["total_assuntos"] if assuntos_result else 0

        # Determine current role and party based on today's date
        current_year = datetime.now().year
        current_role = None
        current_party = None
        
        # Format all mandatos to include in response
        formatted_mandatos = []
        
        if hasattr(participante, 'mandatos'):
            for mandato in participante.mandatos:
                # Add each mandato to the list
                mandato_data = {
                    "role": mandato.role,
                    "party": mandato.party,
                    "term_start": mandato.term_start,
                    "term_end": mandato.term_end,
                    "sort": mandato.sort if hasattr(mandato, 'sort') else None
                }
                formatted_mandatos.append(mandato_data)
                
                if ((mandato.term_start and mandato.term_end and 
                     mandato.term_start <= current_year <= mandato.term_end) or
                    (not mandato.term_start and not mandato.term_end)):
                    current_role = mandato.role
                    current_party = mandato.party

        info = {
            "id": str(participante.id),
            "slug": participante.slug if hasattr(participante, 'slug') else None,
            "name": participante.name,
            "role": current_role, 
            "party": current_party, 
            "mandatos": formatted_mandatos,
            "participante_type": participante.participante_type if hasattr(participante, 'participante_type') else None,
            "profile_photo": f"/uploads/participantes/{clean_name(participante.municipio.name)}/{participante.image_filename}" if hasattr(participante, 'image_filename') and participante.image_filename and hasattr(participante, 'municipio') and participante.municipio else None,
            "municipio_name": participante.municipio.name if hasattr(participante, 'municipio') and participante.municipio else None,
            "municipio_id": str(participante.municipio.id) if hasattr(participante, 'municipio') and participante.municipio else None,
            "municipio_slug": participante.municipio.slug if hasattr(participante.municipio, 'slug') else None,
            "municipio_image": f"/uploads/municipios/{clean_name(participante.municipio.name)}/{participante.municipio.squared_image_filename}" if hasattr(participante.municipio, 'squared_image_filename') else None,
            "total_atas": total_atas,
            "total_assuntos": total_assuntos
        }
        return jsonify(info), 200
    except DoesNotExist:
        return jsonify({"error": "Participante não encontrado"}), 404
    except ValidationError:
        return

@public_bp.route("/atas/search/export", methods=["GET"])
def export_atas_search():
    """
    Endpoint to export the search results (minutes).
    ---
    tags:
      - Public
      - Meeting Minutes
      - Search
    description: Search municipal meeting minutes using keyword, filters, and advanced logic. Returns paginated results, facets, and autocomplete suggestions.
    parameters:
      - in: query
        name: q
        schema:
          type: string
        description: Keyword for full-text search
      - in: query
        name: title
        schema:
          type: string
        description: Filter by title
      - in: query
        name: content
        schema:
          type: string
        description: Filter by content
      - in: query
        name: municipio_id
        schema:
          type: string
        description: City council ID or slug
      - in: query
        name: tipo
        schema:
          type: string
        description: Type of municipal meeting minute
      - in: query
        name: participant_id
        schema:
          type: array
          items:
            type: string
        description: Filter by participant IDs (comma-separated or repeated)
      - in: query
        name: participants_logic
        schema:
          type: string
          enum: [and, or]
        description: Logic for participant filter (AND/OR)
      - in: query
        name: party
        schema:
          type: string
        description: Filter by party
      - in: query
        name: topico
        schema:
          type: array
          items:
            type: string
        description: Filter by topic IDs or slugs
      - in: query
        name: topicos_logic
        schema:
          type: string
          enum: [and, or]
        description: Logic for topic filter (AND/OR)
      - in: query
        name: start_date
        schema:
          type: string
          format: date
        description: Start date (YYYY-MM-DD)
      - in: query
        name: end_date
        schema:
          type: string
          format: date
        description: End date (YYYY-MM-DD)
      - in: query
        name: page
        schema:
          type: integer
        description: Page number
      - in: query
        name: per_page
        schema:
          type: integer
        description: Results per page
      - in: query
        name: sort
        schema:
          type: string
        description: Sort field
      - in: query
        name: order
        schema:
          type: string
          enum: [asc, desc]
        description: Sort order
      - in: query
        name: demo
        schema:
          type: string
        description: Use demo database (1 for demo)
    responses:
      200:
        description: Search results with pagination, facets, and autocomplete
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    type: object
                pagination:
                  type: object
                applied_filters:
                  type: object
                facets:
                  type: object
                autocomplete_suggestions:
                  type: array
                  items:
                    type: string
                search_info:
                  type: object
      400:
        description: Invalid request or filter
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      500:
        description: Internal error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
    """
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    search_logger.info(f"AUID: {anon_user_id} - /atas/search/export endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        base_query = {}
        highlights_by_id = {}

        keyword = request.args.get("q", "").strip()
        title = request.args.get("title", "").strip()
        content = request.args.get("content", "").strip()

        # Log the incoming search parameters
        search_logger.info(f"/atas/search/export called, query={keyword}")

        # Handle both multiple parameters and comma-separated values
        topicos = []
        for topic_param in request.args.getlist("topico"):
            if ',' in topic_param:
                topicos.extend([t.strip() for t in topic_param.split(',') if t.strip()])
            elif topic_param.strip():
                topicos.append(topic_param.strip())

        municipio_id = request.args.get("municipio_id", "").strip()
        tipo = request.args.get("tipo", "").strip()
        
        # Handle both multiple parameters and comma-separated participant_ids
        participant_ids = []
        for participant_param in request.args.getlist("participant_id"):
            if ',' in participant_param:
                participant_ids.extend([p.strip() for p in participant_param.split(',') if p.strip()])
            elif participant_param.strip():
                participant_ids.append(participant_param.strip())
        
        # Get AND/OR logic parameters (default to OR for backwards compatibility)
        participants_logic = request.args.get("participants_logic", "or").lower()
        topicos_logic = request.args.get("topicos_logic", "or").lower()
                
        party = request.args.get("party", "").strip()
        start_date = request.args.get("start_date", "").strip()
        end_date = request.args.get("end_date", "").strip()

        ata_ids = []
        used_fallback = False
        
        # keyword search is done with atlas search index (mongo atlas) - UPDATED TO MATCH MAIN SEARCH
        if keyword:
            # saving the query keyword on the database
            Query.objects(query=keyword).using(db_alias).update_one(
                set__last_seen=datetime.now(),
                inc__count=1,
                set_on_insert__first_seen=datetime.now(),
                upsert=True
            )

            atas_collection = Ata.objects.using(db_alias)  # FIXED: was using Assunto.objects
            search_results = []
            final_ata_ids = []
            search_method_used = "none"

            # Stage 1: Exact Match Search (using lucene.keyword analyzer) - SAME AS MAIN SEARCH
            exact_search_pipeline = [
                {
                    "$search": {
                        "index": "atas_search",
                        "compound": {
                            "must": [
                                {
                                    "compound": {
                                        "should": [
                                            # Exact phrase in title/summary/location (highest boost)
                                            {
                                                "phrase": {
                                                    "query": keyword,
                                                    "path": ["title", "summary", "location", "content"],
                                                    "slop": 0,
                                                    "score": { "boost": { "value": 50 } }
                                                }
                                            },
                                            # All tokens anywhere in title/summary
                                            {
                                                "text": {
                                                    "query": keyword,
                                                    "path": ["title", "summary"],
                                                    "score": { "boost": { "value": 5 } },
                                                    "matchCriteria": "all"
                                                }
                                            },
                                            # All tokens anywhere in location
                                            {
                                                "text": {
                                                    "query": keyword,
                                                    "path": "location",
                                                    "score": { "boost": { "value": 2 } },
                                                    "matchCriteria": "all"
                                                }
                                            }
                                        ],
                                        "minimumShouldMatch": 1
                                    }
                                }
                            ],
                            "should": [
                                # All tokens anywhere in content (small influence)
                                {
                                    "text": {
                                        "query": keyword,
                                        "path": "content",
                                        "score": { "boost": { "value": 0.1 } },
                                        "matchCriteria": "all"
                                    }
                                }
                            ]
                        },
                        "highlight": {
                            "path": ["title", "summary", "content", "location"]
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "score": { "$meta": "searchScore" },
                        "highlights": { "$meta": "searchHighlights" }
                    }
                },
                { "$sort": { "score": -1 } }
            ]

            try:
                # Execute search
                exact_results = []

                # Stage 1: Exact search
                try:
                    exact_results = list(atas_collection.aggregate(exact_search_pipeline))
                    search_logger.info(f"Export exact search found {len(exact_results)} results for keyword '{keyword}'")
                except Exception as exact_error:
                    search_logger.error(f"Export exact search error: {exact_error}")

                # Merge and score results
                scored_results = {}
                
                # Process exact results (highest priority - score × 3)
                for result in exact_results:
                    ata_id = result["_id"]
                    scored_results[ata_id] = {
                        "id": ata_id,
                        "score": result["score"] * 3,
                        "highlights": result.get("highlights", []),
                        "search_type": "exact"
                    }

                # Sort by final score and extract data
                sorted_results = sorted(scored_results.values(), key=lambda x: x["score"], reverse=True)
                final_ata_ids = [result["id"] for result in sorted_results]
                
                # Process highlights
                for result in sorted_results:
                    if result["highlights"]:
                        highlights_by_id[result["id"]] = result["highlights"]

                # Determine which search method was most effective
                if len(exact_results) > 0:
                    search_method_used = "exact_primary"
                else:
                    search_method_used = "no_results"

                if final_ata_ids:
                    base_query["id__in"] = final_ata_ids
                    search_logger.info(f"Export multi-stage search found {len(final_ata_ids)} results using {search_method_used} for keyword '{keyword}'")
                else:
                    search_logger.info("No atas found for keyword search in export.")
                    return jsonify({"error": "No atas found for export"}), 404

            except Exception as search_error:
                search_logger.error(f"Export multi-stage search error: {search_error}")
                search_method_used = "error"
                return jsonify({"error": "Search error occurred"}), 500

            # Update the search_method variable for logging
            search_method = search_method_used if final_ata_ids else "no_keyword"

        if title:
            base_query["title__icontains"] = title
        if content:
            base_query["content__icontains"] = content

        if municipio_id:
            if ObjectId.is_valid(municipio_id):
                base_query["municipio"] = ObjectId(municipio_id)
            else:
                try:
                    municipio = Municipio.objects.using(db_alias).get(slug=municipio_id)
                    base_query["municipio"] = str(municipio.id)
                except (DoesNotExist, ValidationError):
                    return jsonify({"error": "Invalid or non-existent municipio_id"}), 404

        if tipo:
            base_query["tipo"] = tipo.lower()

        # UPDATED participant handling to match main search logic exactly
        if participant_ids:
            try:
                if participants_logic == "and":
                    # AND logic: find atas that have ALL specified participants
                    intersection_ata_ids = None
                    
                    for participant_id in participant_ids:
                        if not participant_id.strip():
                            continue  # skip empty participants
                        
                        try:
                            participant_id_to_use = ObjectId(participant_id) if ObjectId.is_valid(participant_id) else participant_id
                            participant_atas = Ata.objects(participantes__in=[participant_id_to_use]).using(db_alias).only('id')
                            participant_ata_ids = set(ata.id for ata in participant_atas)
                        except Exception as e:
                            search_logger.warning(f"Error processing participant_id {participant_id}: {str(e)}")
                            continue
                            
                        if not participant_ata_ids:
                            intersection_ata_ids = set()
                            break
                            
                        if intersection_ata_ids is None:
                            intersection_ata_ids = participant_ata_ids
                        else:
                            intersection_ata_ids = intersection_ata_ids.intersection(participant_ata_ids)
                            
                        if not intersection_ata_ids:
                            break
                    
                    if intersection_ata_ids:
                        if "id__in" in base_query:
                            existing_ids = set(base_query["id__in"])
                            filtered_ids = existing_ids.intersection(intersection_ata_ids)
                            if not filtered_ids:
                                return jsonify({"error": "No atas found for export with participant filters"}), 404
                            base_query["id__in"] = list(filtered_ids)
                        else:
                            base_query["id__in"] = list(intersection_ata_ids)
                    else:
                        return jsonify({"error": "No atas found for export with participant filters"}), 404
                else:
                    # OR logic: find atas that have ANY of the specified participants (original logic)
                    all_participant_ata_ids = set()
                    first_participant = True
                    
                    for participant_id in participant_ids:
                        if not participant_id.strip():
                            continue  # Skip empty participant IDs
                        
                        try:
                            participant_id_to_use = ObjectId(participant_id) if ObjectId.is_valid(participant_id) else participant_id
                            participant_atas = Ata.objects(participantes__in=[participant_id_to_use]).using(db_alias).only('id')
                            participant_ata_ids = set(ata.id for ata in participant_atas)
                        except Exception as e:
                            search_logger.warning(f"Error processing participant_id {participant_id}: {str(e)}")
                            continue
                            
                        if not participant_ata_ids:
                            continue  # Skip participants with no atas
                            
                        if first_participant:
                            all_participant_ata_ids = participant_ata_ids
                            first_participant = False
                        else:
                            all_participant_ata_ids.update(participant_ata_ids)
                    
                    if all_participant_ata_ids:
                        if "id__in" in base_query:
                            existing_ids = set(base_query["id__in"])
                            filtered_ids = existing_ids.intersection(all_participant_ata_ids)
                            if not filtered_ids:
                                return jsonify({"error": "No atas found for export with participant filters"}), 404
                            base_query["id__in"] = list(filtered_ids)
                        else:
                            base_query["id__in"] = list(all_participant_ata_ids)
                    else:
                        return jsonify({"error": "No atas found for export with participant filters"}), 404
            except Exception as e:
                search_logger.error(f"Error processing participant filters in export: {str(e)}")
                return jsonify({"error": f"Invalid or non-existent participant_id: {str(e)}"}), 400

        # UPDATED party handling to match main search logic exactly
        if party:
            try:
                party_participants = Participante.objects(mandatos__match={'party__iexact': party}).using(db_alias).only('id')
                if not party_participants:
                    return jsonify({"error": "No atas found for export with party filter"}), 404
                
                participant_ids_list = [participant.id for participant in party_participants]
                party_atas = Ata.objects(participantes__in=participant_ids_list).using(db_alias).only('id')
                party_ata_ids = [ata.id for ata in party_atas]
                
                if party_ata_ids:
                    if "id__in" in base_query:
                        base_query["id__in"] = [id for id in base_query["id__in"] if id in party_ata_ids]
                        if not base_query["id__in"]:
                            return jsonify({"error": "No atas found for export with party filter"}), 404
                    else:
                        base_query["id__in"] = party_ata_ids
                else:
                    return jsonify({"error": "No atas found for export with party filter"}), 404
            except Exception as e:
                search_logger.error(f"Party filter error in export: {str(e)}")
                return jsonify({"error": f"Error processing party filter: {str(e)}"}), 400
            
        # UPDATED topicos handling to match main search logic exactly
        if topicos:
            try:
                search_logger.info(f"Processing topicos filter for export with values: {topicos} using {topicos_logic.upper()} logic")
                topico_ids = []
                for topico in topicos:
                    if not topico.strip():
                        continue
                    search_logger.debug(f"Processing topico: {topico}")
                    if ObjectId.is_valid(topico):
                        topico_ids.append(ObjectId(topico))
                        search_logger.debug(f"Added ObjectId for topico: {topico}")
                    else:
                        topico_obj = Topico.objects(slug=topico).only('id').using(db_alias).first()
                        if topico_obj:
                            topico_ids.append(topico_obj.id)
                            search_logger.debug(f"Found topico by slug: {topico} -> {topico_obj.id}")
                        else:
                            search_logger.warning(f"Invalid topico for export (not found): {topico}")
                            
                if not topico_ids:
                    search_logger.warning("No valid topico IDs found for export")
                    return jsonify({"error": "No atas found for export with topico filter"}), 404
                
                assunto_collection = Assunto.objects.using(db_alias)
                
                if topicos_logic == "and":
                    # AND logic: find atas that have assuntos for ALL specified topics
                    intersection_ata_ids = None
                    
                    for topico_id in topico_ids:
                        pipeline = [
                            {"$match": {"topico": topico_id}},
                            {"$group": {"_id": "$ata"}},
                            {"$project": {"ata_id": "$_id"}}
                        ]
                        aggregation_results = list(assunto_collection.aggregate(pipeline))
                        topic_ata_ids = set(ObjectId(result["ata_id"]) for result in aggregation_results)
                        
                        if not topic_ata_ids:
                            # If any topic has no atas, result should be empty for AND logic
                            intersection_ata_ids = set()
                            break
                            
                        if intersection_ata_ids is None:
                            intersection_ata_ids = topic_ata_ids
                        else:
                            intersection_ata_ids = intersection_ata_ids.intersection(topic_ata_ids)
                            
                        # Early exit if intersection becomes empty
                        if not intersection_ata_ids:
                            break
                    
                    ata_ids = list(intersection_ata_ids) if intersection_ata_ids else []
                else:
                    # OR logic: find atas that have assuntos for ANY of the specified topics (original logic)
                    pipeline = [
                        {"$match": {"topico": {"$in": topico_ids}}},
                        {"$group": {"_id": "$ata"}},
                        {"$project": {"ata_id": "$_id"}}
                    ]
                    aggregation_results = list(assunto_collection.aggregate(pipeline))
                    ata_ids = [ObjectId(result["ata_id"]) for result in aggregation_results]
                
                if not ata_ids:
                    search_logger.info(f"No atas found with the specified topicos for export using {topicos_logic.upper()} logic")
                    return jsonify({"error": "No atas found for export with topico filter"}), 404
                    
                search_logger.info(f"Found {len(ata_ids)} atas with assuntos that have the specified topicos for export using {topicos_logic.upper()} logic")
                if "id__in" in base_query:
                    existing_ids = set(base_query["id__in"])
                    filtered_ids = [id for id in ata_ids if id in existing_ids]
                    if not filtered_ids:
                        search_logger.info("No atas match the topicos filter after applying other filters for export")
                        return jsonify({"error": "No atas found for export with topico filter"}), 404
                    base_query["id__in"] = filtered_ids
                else:
                    base_query["id__in"] = ata_ids
            except Exception as e:
                search_logger.error(f"Topico filter error in export: {str(e)}")
                search_logger.exception("Detailed topico filter error:")
                return jsonify({"error": f"Error processing topico filter: {str(e)}"}), 400

        search_method = "fallback" if used_fallback else "primary" if keyword else "no_keyword"
        search_logger.info(
            f"Export search - query={keyword} | search_method={search_method} | total_found={len(ata_ids) if ata_ids else 0}"
        )

        # Build main query
        base_query["status"] = "done"
        # base_query["human_validated"] = True
        query = Ata.objects(**base_query).using(db_alias)

        # Apply date filters
        start_datetime = None
        end_datetime = None

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                start_datetime = datetime.combine(start_date_obj, time.min, tzinfo=timezone.utc)
                query = query.filter(date__gte=start_datetime)
            except ValueError:
                return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                end_datetime = datetime.combine(end_date_obj, time.max, tzinfo=timezone.utc)
                query = query.filter(date__lt=end_datetime)
            except ValueError:
                return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400

        # Get all matching atas (no pagination)
        atas = query.order_by("-date")
        
        if not atas:
            return jsonify({"error": "No atas found for export"}), 404
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        
        # Write headers
        headers = [
            'ID', 'Título', 'Município', 'Data', 'Tipo', 'Local', 'Sumário',
            'Hora Início', 'Hora Fim', 'Participantes', 'Total Assuntos', 
            'Total Páginas', 'URL'
        ]
        writer.writerow(headers)
        
        # Write data
        total_exported = 0
        for ata in atas:
            # Get participants
            participantes_names = []
            if ata.participantes:
                participantes_names = [p.name for p in ata.participantes]
            
            # Count assuntos
            assuntos_count = Assunto.objects(ata=ata).using(db_alias).count()
            
            row = [
                str(ata.slug),
                ata.title or '',
                ata.municipio.name if ata.municipio else '',
                ata.date.strftime('%Y-%m-%d') if ata.date else '',
                ata.tipo or '',
                ata.location or '',
                (ata.summary or '')[:500] + ('...' if len(ata.summary or '') > 500 else ''),  # Limit summary length
                ata.start_datetime.strftime('%H:%M') if ata.start_datetime else '',
                ata.end_datetime.strftime('%H:%M') if ata.end_datetime else '',
                ', '.join(participantes_names),
                assuntos_count,
                getattr(ata, 'pages', 0) or 0,
                f"{API_URL}/public/atas/{str(ata.slug)}"
            ]
            writer.writerow(row)
            total_exported += 1

        # Create response
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename=atas_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        search_logger.info(f"AUID: {anon_user_id} - Exported {total_exported} atas to CSV using search_method: {search_method}")
        
        return response
        
    except Exception as e:
        search_logger.error(f"CSV export error for atas: {str(e)}")
        return jsonify({"error": f"Error exporting data: {str(e)}"}), 500


@public_bp.route("/assuntos/search/export", methods=["GET"])
def export_assuntos_search():
    """Export all assuntos search results as CSV."""
    anon_user_id = str(g.anon_user_id) if hasattr(g, "anon_user_id") else None
    search_logger.info(f"AUID: {anon_user_id} - /assuntos/search/export endpoint accessed")
    
    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"

    try:
        # Use the same filtering logic as search_assuntos but without pagination
        keyword = request.args.get("q", "").strip()
        title = request.args.get("title", "").strip()
        municipio_id = request.args.get("municipio_id", "").strip()
        
        # Log the incoming search parameters
        search_logger.info(f"/assuntos/search/export called, query={keyword}")
        
        topicos = []
        for topic_param in request.args.getlist("topico"):
            if ',' in topic_param:
                topicos.extend([t.strip() for t in topic_param.split(',') if t.strip()])
            elif topic_param.strip():
                topicos.append(topic_param.strip())
                
        participant_ids = []
        for participant_param in request.args.getlist("participant_id"):
            if ',' in participant_param:
                participant_ids.extend([p.strip() for p in participant_param.split(',') if p.strip()])
            elif participant_param.strip():
                participant_ids.append(participant_param.strip())
                
        aprovado = request.args.get("aprovado")
        start_date = request.args.get("start_date", "").strip()
        end_date = request.args.get("end_date", "").strip()
        party = request.args.get("party", "").strip()
        
        # base query
        base_query = {}
        ata_ids = None
        
        # Apply text filters
        if title:
            base_query["title__icontains"] = title
            
        # Handle multiple topicos
        if topicos:
            topico_ids = []
            for topico in topicos:
                if ObjectId.is_valid(topico):
                    topico_ids.append(ObjectId(topico))
            
            if topico_ids:
                base_query["topico__in"] = topico_ids
            
        if aprovado is not None and aprovado.strip():
            search_logger.info(f"Filtering by aprovado for export: {aprovado}")
            base_query["aprovado"] = aprovado.lower() == "true"
        
        # Handle municipio filter (requires joining with atas)
        if municipio_id:
            try:
                if ObjectId.is_valid(municipio_id):
                    atas = Ata.objects(municipio=municipio_id).using(db_alias).only('id')
                else:
                    municipio = Municipio.objects.get(slug=municipio_id)
                    atas = Ata.objects(municipio=municipio.id).using(db_alias).only('id')
                
                ata_ids = [ata.id for ata in atas]
                if not ata_ids:
                    search_logger.info(f"No atas found for municipio_id in export: {municipio_id}")
                    return jsonify({"error": "No assuntos found for export"}), 404
                
                base_query["ata__in"] = ata_ids
            except (DoesNotExist, ValidationError):
                search_logger.warning(f"Invalid municipio_id in export: {municipio_id}")
                return jsonify({"error": "Invalid or non-existent municipio_id"}), 400
        
        # Handle participant filter
        if participant_ids:
            try:
                all_participant_assunto_ids = set()
                first_participant = True
                
                for participant_id in participant_ids:
                    try:
                        if not ObjectId.is_valid(participant_id):
                            continue
                        
                        participant_id_obj = ObjectId(participant_id)
                        
                        # Find assuntos where this participant has a vote
                        pipeline = [
                            {"$match": {"votos.participante": participant_id_obj}},
                            {"$project": {"_id": 1}}
                        ]
                        
                        participant_assunto_ids = [doc["_id"] for doc in Assunto.objects.using(db_alias).aggregate(*pipeline)]
                        
                        if not participant_assunto_ids:
                            continue
                            
                        if first_participant:
                            all_participant_assunto_ids = set(participant_assunto_ids)
                            first_participant = False
                        else:
                            all_participant_assunto_ids.update(participant_assunto_ids)
                    except Exception as e:
                        search_logger.warning(f"Error processing participant_id {participant_id} in export: {str(e)}")
                        continue
                
                if not all_participant_assunto_ids:
                    search_logger.info("No assuntos found for the provided participant_ids in export")
                    return jsonify({"error": "No assuntos found for export with participant filter"}), 404
                    
                if "id__in" in base_query:
                    existing_ids = set(base_query["id__in"])
                    filtered_ids = existing_ids.intersection(all_participant_assunto_ids)
                    if not filtered_ids:
                        search_logger.info("No assuntos found after participant intersection in export")
                        return jsonify({"error": "No assuntos found for export with participant filter"}), 404
                    base_query["id__in"] = list(filtered_ids)
                else:
                    base_query["id__in"] = list(all_participant_assunto_ids)
            except Exception as e:
                search_logger.error(f"Error processing participant filters in export: {str(e)}")
                return jsonify({"error": f"Invalid or non-existent participant_id: {str(e)}"}), 400
        
        # Handle party filter
        if party:
            try:
                party_participants = Participante.objects(mandatos__match={'party__iexact': party}).using(db_alias).only('id')
                if not party_participants:
                    search_logger.info(f"No participants found for party in export: {party}")
                    return jsonify({"error": "No assuntos found for export with party filter"}), 404
                
                participant_ids_list = [participant.id for participant in party_participants]
                search_logger.info(f"Found {len(participant_ids_list)} participants for party in export: {party}")

                party_assunto_ids = set()
                pipeline = [
                    {"$match": {"votos.participante": {"$in": participant_ids_list}}},
                    {"$project": {"_id": 1}}
                ]
                
                party_assunto_ids = {doc["_id"] for doc in Assunto.objects.using(db_alias).aggregate(*pipeline)}
                search_logger.info(f"Found {len(party_assunto_ids)} assuntos for party in export: {party}")
                
                if party_assunto_ids:
                    if "id__in" in base_query:
                        existing_ids = set(base_query["id__in"])
                        filtered_ids = existing_ids.intersection(party_assunto_ids)
                        if not filtered_ids:
                            search_logger.info(f"No assuntos found for party in export: {party}")
                            return jsonify({"error": "No assuntos found for export with party filter"}), 404
                        base_query["id__in"] = list(filtered_ids)
                        search_logger.info(f"Filtered assuntos for party in export: {party} to {len(filtered_ids)}")
                    else:
                        base_query["id__in"] = list(party_assunto_ids)
                        search_logger.info(f"Filtered assuntos for party in export: {party} to {len(party_assunto_ids)}")
                else:
                    search_logger.info(f"No assuntos found for party in export: {party}")
                    return jsonify({"error": "No assuntos found for export with party filter"}), 404
            except Exception as e:
                search_logger.error(f"Party filter error in export: {str(e)}")
                return jsonify({"error": f"Error processing party filter: {str(e)}"}), 400
        
        # Handle date filters
        start_datetime = end_datetime = None
        
        if start_date or end_date:
            date_query = {}
            
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                    start_datetime = datetime.combine(start_date_obj, time.min, tzinfo=timezone.utc)
                    date_query["date__gte"] = start_datetime
                except ValueError:
                    search_logger.error(f"Invalid start_date format in export: {start_date}")
                    return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
                    
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                    end_datetime = datetime.combine(end_date_obj, time.max, tzinfo=timezone.utc)
                    date_query["date__lt"] = end_datetime
                except ValueError:
                    search_logger.error(f"Invalid end_date format in export: {end_date}")
                    return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
            
            # Get atas matching the date criteria
            date_atas = Ata.objects(**date_query).using(db_alias).only('id')
            date_ata_ids = [ata.id for ata in date_atas]
            
            if not date_ata_ids:
                search_logger.info("No atas found matching date criteria in export")
                return jsonify({"error": "No assuntos found for export with date filter"}), 404
                
            if "ata__in" in base_query:
                base_query["ata__in"] = [id for id in base_query["ata__in"] if id in date_ata_ids]
                if not base_query["ata__in"]:
                    search_logger.info("No atas found after date intersection in export")
                    return jsonify({"error": "No assuntos found for export with date filter"}), 404
            else:
                base_query["ata__in"] = date_ata_ids

        # Handle keyword search
        if keyword:
            try:
                assuntos_collection = Assunto.objects.using(db_alias)
                
                search_pipeline = [
                    {
                        "$search": {
                            "index": "assuntos_search",
                            "compound": {
                                "should": [
                                    {
                                        "text": {
                                            "query": keyword,
                                            "path": "title",
                                            
                                            "score": {"boost": {"value": 3}},
                                            "matchCriteria": "all"
                                        }
                                    },
                                    {
                                        "text": {
                                            "query": keyword,
                                            "path": "deliberacao",
                                            
                                            "score": {"boost": {"value": 2}},
                                            "matchCriteria": "all"
                                        }
                                    },
                                    {
                                        "text": {
                                            "query": keyword,
                                            "path": "summary",
                                            
                                            "matchCriteria": "all"
                                        }
                                    }
                                ],
                                "minimumShouldMatch": 1
                            }
                        }
                    },
                    {
                        "$project": {
                            "_id": 1,
                            "score": {"$meta": "searchScore"}
                        }
                    },
                    {"$sort": {"score": -1}}
                ]
                

                if base_query:
                    match_stage = {"$match": {}}
                    for key, value in base_query.items():
                        if key == "title__icontains":
                            continue 
                        if "__" in key:
                            field, op = key.split("__", 1)
                            if field == "id":
                                field = "_id"
                            if op == "in":
                                match_stage["$match"][field] = {"$in": value}
                            elif op == "icontains":
                                match_stage["$match"][field] = {"$regex": value, "$options": "i"}
                        else:
                            mongo_field = "_id" if key == "id" else key
                            match_stage["$match"][mongo_field] = value
                    
                    if match_stage["$match"]:
                        search_pipeline.insert(1, match_stage)
                        search_logger.info(f"Added match stage to export search pipeline: {match_stage['$match']}")
                
                search_results = list(assuntos_collection.aggregate(search_pipeline))
                search_logger.info(f"Export search found {len(search_results)} results for keyword: {keyword}")
                assunto_ids = [res["_id"] for res in search_results]
                
                if not assunto_ids:
                    search_logger.info("No search results found for keyword in export")
                    return jsonify({"error": "No assuntos found for export"}), 404
                
                if "id__in" in base_query:
                    existing_ids = set(base_query["id__in"])
                    filtered_ids = [id for id in assunto_ids if id in existing_ids]
                    if not filtered_ids:
                        search_logger.info("No search results found after keyword intersection in export")
                        return jsonify({"error": "No assuntos found for export"}), 404
                    base_query["id__in"] = filtered_ids
                else:
                    base_query["id__in"] = assunto_ids
            except Exception as search_error:
                search_logger.error(f"Search index error in export: {search_error}")
                # Fallback to simple query
                if keyword:
                    query = Assunto.objects(**base_query).using(db_alias).filter(
                        Q(title__icontains=keyword) | 
                        Q(summary__icontains=keyword) |
                        Q(deliberacao__icontains=keyword)
                    )
                else:
                    query = Assunto.objects(**base_query).using(db_alias)
        else:
            query = Assunto.objects(**base_query).using(db_alias)
        
        # Get all matching assuntos (no pagination)
        if keyword and "id__in" not in base_query:
            # Use the fallback query we created above
            pass
        else:
            query = Assunto.objects(**base_query).using(db_alias)
            if keyword and "id__in" not in base_query:
                query = query.filter(
                    Q(title__icontains=keyword) | 
                    Q(summary__icontains=keyword) |
                    Q(deliberacao__icontains=keyword)
                )
        
        assuntos = query.order_by("-id")
        
        if not assuntos:
            return jsonify({"error": "No assuntos found for export"}), 404
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        
        # Write headers
        headers = [
            'ID', 'Título', 'Deliberação', 'Resumo', 'Aprovado', 'Votos Favor', 
            'Votos Contra', 'Abstenções', 'Data Votação', 'Tópico', 'Ata Título', 
            'Ata Data', 'Município', 'Total Votos', 'URL Assunto', 'URL Ata'
        ]
        writer.writerow(headers)
        
        # Write data
        total_exported = 0
        for assunto in assuntos:
            ata = assunto.ata
            topico = assunto.topico if hasattr(assunto, 'topico') and assunto.topico else None
            
            # Count total votes
            total_votos = len(assunto.votos) if hasattr(assunto, 'votos') and assunto.votos else 0
            
            row = [
                str(assunto.id),
                assunto.title or '',
                (assunto.deliberacao or '')[:500] + ('...' if len(assunto.deliberacao or '') > 500 else ''),
                (assunto.summary or '')[:500] + ('...' if len(assunto.summary or '') > 500 else ''),
                'Sim' if assunto.aprovado else 'Não',
                assunto.votos_favor or 0,
                assunto.votos_contra or 0,
                assunto.abstencoes or 0,
                assunto.data_votacao.strftime('%Y-%m-%d') if hasattr(assunto, 'data_votacao') and assunto.data_votacao else '',
                topico.title if topico else '',
                ata.title if ata else '',
                ata.date.strftime('%Y-%m-%d') if ata and ata.date else '',
                ata.municipio.name if ata and ata.municipio else '',
                total_votos,
                f"{API_URL}/public/assuntos/{str(assunto.id)}",
                f"{API_URL}/public/atas/{str(ata.id)}" if ata else ''
            ]
            writer.writerow(row)
            total_exported += 1

        # Create response
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename=assuntos_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        search_logger.info(f"AUID: {anon_user_id} - Exported {total_exported} assuntos to CSV")
        
        return response
        
    except Exception as e:
        search_logger.error(f"CSV export error for assuntos: {str(e)}")
        return jsonify({"error": f"Error exporting data: {str(e)}"}), 500


@public_bp.route("/atas/<ata_id>/participants/<participant_id>/details", methods=["GET"])
def get_participant_details(ata_id, participant_id):
    """
    Endpoint to get detailed information about a participant in a specific ata.
    """

    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"
    
    # Get language parameter
    lang = request.args.get("lang", "pt").lower()
    use_english = lang == "en"

    try:
        if ObjectId.is_valid(ata_id):
            ata = Ata.objects.using(db_alias).get(id=ata_id)
        else:
            ata = Ata.objects.using(db_alias).get(slug=ata_id)
        if not ata:
            return jsonify({"error": "Ata not found"}), 404

        if ObjectId.is_valid(participant_id):
            participante = Participante.objects.using(db_alias).get(id=participant_id)
        else:
            participante = Participante.objects.using(db_alias).get(slug=participant_id)
        if not participante:
            return jsonify({"error": "Participant not found"}), 404

        # Find the correct mandato for this ata's date
        mandato_for_ata = None
        if hasattr(participante, "mandatos") and ata.date:
            for mandato in participante.mandatos:
                if mandato.term_start and mandato.term_end:
                    if mandato.term_start <= ata.date.year <= mandato.term_end:
                        mandato_for_ata = mandato
                        break
                elif not mandato.term_start and not mandato.term_end:
                    mandato_for_ata = mandato
                    break

        # Get municipio info safely without dereferencing
        municipio_name = None
        profile_photo = None
        if 'municipio' in participante._data and participante._data['municipio']:
            municipio_ref = participante._data['municipio']
            municipio_id = municipio_ref.id if hasattr(municipio_ref, 'id') else municipio_ref
            try:
                municipio = Municipio.objects.using(db_alias).get(id=municipio_id)
                municipio_name = municipio.name_en if use_english and hasattr(municipio, 'name_en') and municipio.name_en else municipio.name
                if hasattr(participante, 'image_filename') and participante.image_filename:
                    profile_photo = f"/uploads/participantes/{municipio.name}/{participante.image_filename}"
            except DoesNotExist:
                current_app.logger.warning(f"Municipio {municipio_id} not found in {db_alias} database")
            except Exception as e:
                current_app.logger.error(f"Error fetching municipio for participant: {str(e)}")

        participant_info = {
            "id": str(participante.id),
            "name": participante.name,
            "role": getattr(mandato_for_ata, "role_en", None) if use_english and mandato_for_ata and hasattr(mandato_for_ata, "role_en") and getattr(mandato_for_ata, "role_en") else getattr(mandato_for_ata, "role", None) if mandato_for_ata else None,
            "party": getattr(mandato_for_ata, "party", None) if mandato_for_ata else None,
            "profile_photo": profile_photo,
            "bio": getattr(participante, "bio", None),
            "municipio": municipio_name,
        }

        # Find all votes by this participant in this ata
        votes = []
        assuntos = Assunto.objects(ata=ata).using(db_alias)
        for assunto in assuntos:
            # Each assunto has a list of votos (EmbeddedDocument)
            for voto in assunto.votos:
                # Get participante ID safely without dereferencing
                if 'participante' in voto._data and voto._data['participante']:
                    participante_ref = voto._data['participante']
                    voto_participante_id = participante_ref.id if hasattr(participante_ref, 'id') else participante_ref
                    if str(voto_participante_id) == str(participante.id):
                        votes.append({
                            "assunto_id": str(assunto.id),
                            "assunto_title": assunto.title_en if use_english and hasattr(assunto, 'title_en') and assunto.title_en else assunto.title,
                            "vote_type": voto.tipo,
                        })

        participant_info["votes"] = votes
        return jsonify(participant_info), 200

    except DoesNotExist:
        return jsonify({"error": "Not found"}), 404
    except ValidationError:
        return jsonify({"error": "Invalid ID"}), 400
    except Exception as e:
        current_app.logger.error(f"Error in get_participant_details: {str(e)}")
        return jsonify({"error": "Internal error"}), 500

@public_bp.route("/atas/<ata_id>/parties/<path:party_name>/details", methods=["GET"])
def get_party_details(ata_id, party_name):
    """
    Endpoint to get detailed information about a party in a specific ata.
    """

    use_demo = request.args.get("demo", "false").lower() in ["1", 1]
    db_alias = "default" if use_demo else "default"
    
    # Get language parameter
    lang = request.args.get("lang", "pt").lower()
    use_english = lang == "en"
    
    try:
        if ObjectId.is_valid(ata_id):
            ata = Ata.objects.using(db_alias).get(id=ata_id)
        else:
            ata = Ata.objects.using(db_alias).get(slug=ata_id)
        if not ata:
            return jsonify({"error": "Ata not found"}), 404

        # Find all participants in this ata with this party
        party_participants = []
        if 'participantes' in ata._data and ata._data['participantes']:
            for participante_ref in ata._data['participantes']:
                participante_id = participante_ref.id if hasattr(participante_ref, 'id') else participante_ref
                try:
                    p = Participante.objects.using(db_alias).get(id=participante_id)
                    if hasattr(p, 'mandatos') and p.mandatos:
                        for mandato in p.mandatos:
                            if mandato.party and mandato.party.lower() == party_name.lower():
                                party_participants.append(p)
                                break
                except DoesNotExist:
                    current_app.logger.warning(f"Participante {participante_id} not found in {db_alias} database")
                    continue
                except Exception as e:
                    current_app.logger.error(f"Error fetching participante for party: {str(e)}")
                    continue 
        if not party_participants:
            return jsonify({"error": "No participants found for this party"}), 404

        # Collect votes for this party in this ata
        votes = []
        assuntos = Assunto.objects(ata=ata).using(db_alias)
        for assunto in assuntos:
            for voto in assunto.votos:
                # Get participante safely without dereferencing
                if 'participante' in voto._data and voto._data['participante']:
                    participante_ref = voto._data['participante']
                    participante_id = participante_ref.id if hasattr(participante_ref, 'id') else participante_ref
                    try:
                        voto_participante = Participante.objects.using(db_alias).get(id=participante_id)
                        if hasattr(voto_participante, 'mandatos') and voto_participante.mandatos:
                            for mandato in voto_participante.mandatos:
                                if mandato.party and mandato.party.lower() == party_name.lower():
                                    votes.append({
                                        "assunto_id": str(assunto.id),
                                        "assunto_title": assunto.title_en if use_english and hasattr(assunto, 'title_en') and assunto.title_en else assunto.title,
                                        "participant_id": str(voto_participante.id),
                                        "participant_name": voto_participante.name,
                                        "vote_type": voto.tipo,
                                    })
                                    break
                    except DoesNotExist:
                        current_app.logger.warning(f"Participante {participante_id} not found in {db_alias} database for vote")
                        continue
                    except Exception as e:
                        current_app.logger.error(f"Error fetching participante for vote: {str(e)}")
                        continue

        # Build participant list with safe municipio access
        participants_list = []
        for p in party_participants:
            profile_photo = None
            if 'municipio' in p._data and p._data['municipio']:
                municipio_ref = p._data['municipio']
                municipio_id = municipio_ref.id if hasattr(municipio_ref, 'id') else municipio_ref
                try:
                    municipio = Municipio.objects.using(db_alias).get(id=municipio_id)
                    if hasattr(p, 'image_filename') and p.image_filename:
                        profile_photo = f"/uploads/participantes/{municipio.name}/{p.image_filename}"
                except DoesNotExist:
                    current_app.logger.warning(f"Municipio {municipio_id} not found for participant profile photo")
                except Exception as e:
                    current_app.logger.error(f"Error fetching municipio for participant profile photo: {str(e)}")
            
            participants_list.append({
                "id": str(p.id),
                "name": p.name,
                "role": p.role if hasattr(p, 'role') else None,
                "profile_photo": profile_photo,
            })

        party_info = {
            "name": party_name,
            "participants": participants_list,
            "votes": votes,
            "description": None  # Fill with real description if you have a Party model
        }
        return jsonify(party_info), 200

    except DoesNotExist:
        return jsonify({"error": "Not found"}), 404
    except ValidationError:
        return jsonify({"error": "Invalid ID"}), 400
    except Exception as e:
        current_app.logger.error(f"Error in get_party_details: {str(e)}")
        return jsonify({"error": "Internal error"}), 500