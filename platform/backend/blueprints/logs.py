from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required
import os
import json
import re
from datetime import datetime, timedelta
from collections import defaultdict, Counter

logs_bp = Blueprint('logs', __name__)

def parse_timestamp_safely(timestamp_str):
    """Safely parse timestamp string to naive datetime object."""
    if not timestamp_str:
        return None
    try:
        # Handle various timestamp formats
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        # Convert to naive datetime for consistent comparison
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        return dt
    except Exception:
        return None

def parse_endpoint_log_line(line):
    """Parse a single line from citilink_endpoint.log (JSON format)."""
    try:
        # Extract timestamp from the beginning of the line
        timestamp_match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})', line)
        log_timestamp = timestamp_match.group(1) if timestamp_match else None
        
        # Identify log type and extract JSON
        if "[REQUEST]" in line:
            log_type = 'request'
        elif "[RESPONSE]" in line:
            log_type = 'response'
        elif "[EXCEPTION]" in line:
            log_type = 'exception'
        else:
            log_type = 'unknown'

        # Find JSON part
        json_start = line.find('{')
        if json_start == -1:
            return None
        
        log_json = line[json_start:]
        entry = json.loads(log_json)
        entry['log_type'] = log_type
        entry['log_timestamp'] = log_timestamp
        
        # Parse the timestamp from JSON for better sorting
        if 'timestamp' in entry:
            entry['parsed_timestamp'] = parse_timestamp_safely(entry['timestamp'])

        # For EXCEPTION, try to extract request_id and endpoint from prefix
        if log_type == 'exception':
            match = re.match(r'\[EXCEPTION\] \[(.*?)\] (.*?) \| (.*)', line)
            if match:
                entry['request_id'] = match.group(1)
                entry['endpoint'] = match.group(2)
                entry['error'] = match.group(3)
        
        return entry
    except Exception as e:
        current_app.logger.error(f"Error parsing log line: {str(e)}")
        return None

def parse_search_log_line(line):
    """Parse a single line from citilink_search.log (to be implemented)."""
    # TODO: Implement parsing logic for search log format
    return None

def parse_log_file(log_file, limit=None, since=None):
    """Dispatch parsing based on log file type with optional filtering."""
    log_dir = current_app.config.get("LOG_DIR", "logs")
    log_path = os.path.join(log_dir, log_file)
    entries = []
    
    if not os.path.isfile(log_path):
        return None
        
    # Calculate since timestamp if provided
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            # Make sure since_dt is naive (remove timezone info for comparison)
            if since_dt.tzinfo is not None:
                since_dt = since_dt.replace(tzinfo=None)
        except Exception as e:
            current_app.logger.error(f"Error parsing since timestamp: {str(e)}")
            pass
    
    with open(log_path, "r") as f:
        if limit:
            # Read last N lines efficiently
            lines = []
            f.seek(0, 2)  # Go to end of file
            file_size = f.tell()
            f.seek(max(0, file_size - 1024 * 1024))  # Read last 1MB max
            content = f.read()
            lines = content.split('\n')[-limit-1:-1]  # Get last N lines
        else:
            lines = f.readlines()
    
    if log_file == "citilink_endpoint.log":
        for line in lines:
            if not line.strip():
                continue
            entry = parse_endpoint_log_line(line)
            if entry:
                # Filter by timestamp if since is provided
                if since_dt and 'parsed_timestamp' in entry:
                    try:
                        if entry['parsed_timestamp'] < since_dt:
                            continue
                    except TypeError as e:
                        # Handle timezone comparison issues
                        current_app.logger.warning(f"Timestamp comparison error: {str(e)}")
                        continue
                entries.append(entry)
    elif log_file == "citilink_search.log":
        for line in lines:
            entry = parse_search_log_line(line)
            if entry:
                entries.append(entry)
    # Add more elif blocks for other log files
    else:
        # Basic line-by-line parsing for unknown formats
        for i, line in enumerate(lines):
            if line.strip():
                entries.append({
                    'line_number': i + 1,
                    'content': line.strip(),
                    'timestamp': None
                })
    
    return entries

@logs_bp.route("/list", methods=["GET"])
@jwt_required()
def list_log_files():
    """Lists available log files in the logs directory."""
    log_dir = current_app.config.get("LOG_DIR", "logs")
    try:
        files = os.listdir(log_dir)
        log_files = [f for f in files if f.endswith('.log')]
        return jsonify({"log_files": log_files}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to list log files: {str(e)}")
        return jsonify({"error": f"Failed to list log files: {str(e)}"}), 500

@logs_bp.route("/view/<log_file>", methods=["GET"])
@jwt_required()
def view_log_file(log_file):
    """Returns the raw contents of a specific log file."""
    log_dir = current_app.config.get("LOG_DIR", "logs")
    log_path = os.path.join(log_dir, log_file)
    try:
        if not os.path.isfile(log_path):
            return jsonify({"error": "Log file not found."}), 404
        with open(log_path, "r") as f:
            content = f.read()
        return jsonify({"log_file": log_file, "content": content}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to read log file {log_file}: {str(e)}")
        return jsonify({"error": f"Failed to read log file: {str(e)}"}), 500

@logs_bp.route("/parsed/<log_file>", methods=["GET"])
@jwt_required()
def parsed_log_file(log_file):
    """Returns parsed log entries for a specific log file with filtering options."""
    # Get query parameters
    limit = request.args.get('limit', type=int)
    since = request.args.get('since')  # ISO timestamp
    log_type = request.args.get('type')  # request, response, exception
    endpoint = request.args.get('endpoint')
    
    entries = parse_log_file(log_file, limit=limit, since=since)
    if entries is None:
        return jsonify({"error": "Log file not found or unsupported format."}), 404
    
    # Apply additional filters
    if log_type and log_file == "citilink_endpoint.log":
        entries = [e for e in entries if e.get('log_type') == log_type]
    
    if endpoint and log_file == "citilink_endpoint.log":
        entries = [e for e in entries if endpoint in e.get('endpoint', '')]
    
    # Sort by timestamp if present
    entries.sort(key=lambda x: x.get("parsed_timestamp") or x.get("timestamp", ""), reverse=True)
    
    return jsonify({
        "parsed_entries": entries,
        "total_count": len(entries),
        "log_file": log_file,
        "filters_applied": {
            "limit": limit,
            "since": since,
            "type": log_type,
            "endpoint": endpoint
        }
    }), 200

@logs_bp.route("/stats/<log_file>", methods=["GET"])
@jwt_required()
def get_log_stats(log_file):
    """Returns comprehensive statistics for a specific log file."""
    time_range = request.args.get('time_range', '24h')  # 1h, 24h, 7d, 30d
    
    entries = parse_log_file(log_file)
    if entries is None:
        return jsonify({"error": "Log file not found or unsupported format."}), 404
    
    # Filter by time range
    now = datetime.now()
    if time_range == '1h':
        since = now - timedelta(hours=1)
    elif time_range == '24h':
        since = now - timedelta(hours=24)
    elif time_range == '7d':
        since = now - timedelta(days=7)
    elif time_range == '30d':
        since = now - timedelta(days=30)
    else:
        since = None
    
    if since:
        entries = [e for e in entries 
                  if e.get('parsed_timestamp') and 
                  isinstance(e['parsed_timestamp'], datetime) and 
                  e['parsed_timestamp'] > since]
    
    stats = {"time_range": time_range, "total_entries": len(entries)}
    
    if log_file == "citilink_endpoint.log":
        # Basic counts
        request_entries = [e for e in entries if e.get('log_type') == 'request']
        response_entries = [e for e in entries if e.get('log_type') == 'response']
        exception_entries = [e for e in entries if e.get('log_type') == 'exception']
        
        stats.update({
            "total_requests": len(request_entries),
            "total_responses": len(response_entries),
            "total_exceptions": len(exception_entries),
        })
        
        # Endpoint analysis
        endpoint_stats = Counter()
        method_stats = defaultdict(Counter)
        user_agent_stats = Counter()
        status_code_stats = Counter()
        response_time_stats = []
        args_analysis = defaultdict(lambda: defaultdict(Counter))
        
        for entry in entries:
            ep = entry.get("endpoint", "unknown")
            method = entry.get("method", "unknown")
            ua = entry.get("user_agent", "unknown")
            args = entry.get("args", {})
            
            endpoint_stats[ep] += 1
            method_stats[ep][method] += 1
            user_agent_stats[ua] += 1
            
            # Response-specific stats
            if entry.get('log_type') == 'response':
                status = entry.get('status')
                if status:
                    status_code_stats[status] += 1
                
                duration = entry.get('duration_ms')
                if duration:
                    response_time_stats.append(duration)
            
            # Args analysis
            for arg_key, arg_val in args.items():
                args_analysis[ep][arg_key][str(arg_val)] += 1
        
        # Calculate response time statistics
        if response_time_stats:
            response_time_stats.sort()
            n = len(response_time_stats)
            stats["response_times"] = {
                "min": min(response_time_stats),
                "max": max(response_time_stats),
                "avg": sum(response_time_stats) / n,
                "median": response_time_stats[n // 2],
                "p95": response_time_stats[int(n * 0.95)] if n > 20 else response_time_stats[-1],
                "p99": response_time_stats[int(n * 0.99)] if n > 100 else response_time_stats[-1],
            }
        
        stats.update({
            "endpoints": dict(endpoint_stats.most_common(20)),
            "methods_per_endpoint": {k: dict(v) for k, v in method_stats.items()},
            "user_agents": dict(user_agent_stats.most_common(10)),
            "status_codes": dict(status_code_stats),
            "args_analysis": {k: {k2: dict(v2.most_common(10)) for k2, v2 in v.items()} for k, v in args_analysis.items()},
        })
        
    elif log_file == "citilink_search.log":
        # TODO: Implement stats for search log
        pass
    
    return jsonify({"stats": stats}), 200

@logs_bp.route("/analysis/<log_file>", methods=["GET"])
@jwt_required()
def analyze_log_file(log_file):
    """Provides detailed analysis of log patterns and insights."""
    if log_file != "citilink_endpoint.log":
        return jsonify({"error": "Analysis only available for endpoint logs"}), 400
    
    entries = parse_log_file(log_file)
    if entries is None:
        return jsonify({"error": "Log file not found"}), 404
    
    # Group requests and responses by request_id
    requests_map = {}
    responses_map = {}
    exceptions_map = {}
    
    for entry in entries:
        req_id = entry.get('request_id')
        if not req_id:
            continue
            
        if entry.get('log_type') == 'request':
            requests_map[req_id] = entry
        elif entry.get('log_type') == 'response':
            responses_map[req_id] = entry
        elif entry.get('log_type') == 'exception':
            exceptions_map[req_id] = entry
    
    # Analyze complete request-response cycles
    complete_cycles = []
    incomplete_requests = []
    
    for req_id, req_entry in requests_map.items():
        if req_id in responses_map:
            resp_entry = responses_map[req_id]
            cycle = {
                "request_id": req_id,
                "endpoint": req_entry.get("endpoint"),
                "method": req_entry.get("method"),
                "args": req_entry.get("args", {}),
                "status": resp_entry.get("status"),
                "duration_ms": resp_entry.get("duration_ms"),
                "response_length": resp_entry.get("response_length"),
                "timestamp": req_entry.get("timestamp"),
                "has_exception": req_id in exceptions_map
            }
            complete_cycles.append(cycle)
        else:
            incomplete_requests.append({
                "request_id": req_id,
                "endpoint": req_entry.get("endpoint"),
                "timestamp": req_entry.get("timestamp")
            })
    
    # Analyze search patterns (for search endpoint)
    search_queries = []
    search_endpoint = "/v0/public/atas/search"
    
    for cycle in complete_cycles:
        if cycle["endpoint"] == search_endpoint:
            args = cycle["args"]
            search_queries.append({
                "query": args.get("q", ""),
                "municipio_id": args.get("municipio_id"),
                "start_date": args.get("start_date"),
                "end_date": args.get("end_date"),
                "tipo": args.get("tipo"),
                "party": args.get("party"),
                "duration_ms": cycle["duration_ms"],
                "status": cycle["status"],
                "timestamp": cycle["timestamp"]
            })
    
    # Popular search terms
    search_terms = Counter()
    for query in search_queries:
        if query["query"]:
            # Simple word extraction (you might want to use proper NLP)
            words = query["query"].lower().split()
            for word in words:
                if len(word) > 2:  # Ignore very short words
                    search_terms[word] += 1
    
    analysis = {
        "total_complete_cycles": len(complete_cycles),
        "incomplete_requests": len(incomplete_requests),
        "total_exceptions": len(exceptions_map),
        "search_analysis": {
            "total_searches": len(search_queries),
            "popular_search_terms": dict(search_terms.most_common(20)),
            "avg_search_duration": sum(q["duration_ms"] for q in search_queries if q["duration_ms"]) / len(search_queries) if search_queries else 0
        },
        "slow_requests": [
            {
                "endpoint": cycle["endpoint"],
                "duration_ms": cycle["duration_ms"],
                "timestamp": cycle["timestamp"],
                "args": cycle["args"]
            }
            for cycle in sorted(complete_cycles, key=lambda x: x.get("duration_ms", 0), reverse=True)[:10]
            if cycle.get("duration_ms", 0) > 1000  # Requests slower than 1 second
        ],
        "error_requests": [
            {
                "endpoint": cycle["endpoint"],
                "status": cycle["status"],
                "timestamp": cycle["timestamp"],
                "args": cycle["args"]
            }
            for cycle in complete_cycles
            if cycle.get("status", 200) >= 400
        ]
    }
    
    return jsonify({"analysis": analysis}), 200

@logs_bp.route("/realtime/<log_file>", methods=["GET"])
@jwt_required()
def realtime_log_updates(log_file):
    """Get recent log entries for real-time monitoring."""
    since = request.args.get('since')  # ISO timestamp
    limit = request.args.get('limit', 50, type=int)
    
    if not since:
        return jsonify({"error": "since parameter required for realtime updates"}), 400
    
    try:
        entries = parse_log_file(log_file, limit=limit, since=since)
        if entries is None:
            return jsonify({"error": "Log file not found"}), 404
        
        # Sort by timestamp - handle both parsed_timestamp and timestamp
        def get_sort_key(x):
            if 'parsed_timestamp' in x and isinstance(x['parsed_timestamp'], datetime):
                return x['parsed_timestamp']
            elif 'timestamp' in x and x['timestamp']:
                try:
                    # Try to parse timestamp for sorting
                    return datetime.fromisoformat(x['timestamp'].replace('Z', '+00:00')).replace(tzinfo=None)
                except:
                    return datetime.min
            else:
                return datetime.min
        
        entries.sort(key=get_sort_key, reverse=False)
        
        return jsonify({
            "new_entries": entries,
            "count": len(entries),
            "last_update": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in realtime updates: {str(e)}")
        return jsonify({"error": f"Error processing realtime updates: {str(e)}"}), 500