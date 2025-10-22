from flask import Blueprint, request, jsonify, current_app, url_for, Response, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
import secrets
import re
import os
import smtplib
import io
import csv
from datetime import datetime, timedelta
from mongoengine import DoesNotExist, ValidationError, NotUniqueError
from models import Newsletter, Municipio, Ata, Assunto, Topico
import hashlib

newsletter_bp = Blueprint('newsletter', __name__)

# Regular expression for email validation
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

def generate_secure_token():
    """Generate a secure random token for verification and unsubscribe"""
    return secrets.token_urlsafe(32)

def validate_request_data():
    """Validate the request data for subscription"""
    data = request.get_json()
    
    if not data:
        return None, (jsonify({"error": "Dados inválidos"}), 400)
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    municipio_ids = data.get("municipio_ids", [])
    
    # Name is optional, but if provided, should be at least 2 characters
    if name and len(name) < 2:
        return None, (jsonify({"error": "Nome deve ter pelo menos 2 caracteres"}), 400)
    
    # Set default name if not provided
    if not name:
        name = "Utilizador"
    
    # Validate email
    if not email or not re.match(EMAIL_REGEX, email):
        return None, (jsonify({"error": "Email inválido"}), 400)
    
    # Validate municipio_ids
    if not municipio_ids or not isinstance(municipio_ids, list):
        return None, (jsonify({"error": "Selecione pelo menos um município"}), 400)
    
    # Check if municipios exist
    municipios = []
    for municipio_id in municipio_ids:
        try:
            municipio = Municipio.objects.get(id=municipio_id)
            municipios.append(municipio)
        except (DoesNotExist, ValidationError):
            return None, (jsonify({"error": f"Município inválido: {municipio_id}"}), 400)
    
    return {
        "name": name,
        "email": email,
        "municipios": municipios
    }, None

@newsletter_bp.route("/subscribe", methods=["POST"])
def subscribe():
    """Subscribe to the newsletter"""
    current_app.logger.info("=== NEWSLETTER SUBSCRIPTION START ===")
    
    # Get client IP for security
    ip_address = request.remote_addr
    current_app.logger.info(f"Client IP: {ip_address}")
    
    # Rate limiting check (prevent spam)
    # In a real implementation, you'd use Redis or similar for rate limiting
    
    # Validate request data
    validated_data, error_response = validate_request_data()
    if error_response:
        current_app.logger.info("Validation failed")
        return error_response
    
    current_app.logger.info(f"Validated data: {validated_data['email']}, municipios: {len(validated_data['municipios'])}")
    
    # Check if email already exists
    existing_subscription = Newsletter.objects(email=validated_data["email"]).first()
    if existing_subscription:
        current_app.logger.info(f"Existing subscription found: verified={existing_subscription.is_verified}")
        if existing_subscription.is_verified:
            return jsonify({"error": "Este email já está subscrito"}), 409
        else:
            # If not verified, update the existing one and send a new verification email
            verification_token = generate_secure_token()
            token_expiry = datetime.now() + timedelta(days=2)
            
            # Update existing subscription
            existing_subscription.name = validated_data["name"]
            existing_subscription.municipios = validated_data["municipios"]
            existing_subscription.verification_token = verification_token
            existing_subscription.token_expiry = token_expiry
            existing_subscription.last_updated = datetime.now()
            existing_subscription.subscription_ip = ip_address
            existing_subscription.save()
            
            current_app.logger.info("Updated existing subscription")
            
            # Send verification email
            send_verification_email(existing_subscription.email, verification_token)
            
            return jsonify({"message": "Email de verificação enviado novamente"}), 200
    
    # Create new subscription
    try:
        current_app.logger.info("Creating new subscription...")
        verification_token = generate_secure_token()
        unsubscribe_token = generate_secure_token()
        token_expiry = datetime.now() + timedelta(days=2)
        
        current_app.logger.info(f"Generated tokens: verification={verification_token[:10]}..., unsubscribe={unsubscribe_token[:10]}...")
        
        newsletter = Newsletter(
            name=validated_data["name"],
            email=validated_data["email"],
            municipios=validated_data["municipios"],
            verification_token=verification_token,
            token_expiry=token_expiry,
            subscription_ip=ip_address,
            unsubscribe_token=unsubscribe_token
        )
        
        current_app.logger.info("Newsletter object created, attempting to save...")
        newsletter.save()
        current_app.logger.info(f"Newsletter saved successfully with ID: {newsletter.id}")
        
        # Send verification email
        try:
            send_verification_email(newsletter.email, verification_token)
            current_app.logger.info("Verification email sent")
        except Exception as email_error:
            current_app.logger.error(f"Email sending failed: {email_error}")
            # Continue even if email fails for now
        
        return jsonify({"message": "Subscrição realizada com sucesso. Por favor verifique o seu email."}), 201
        
    except NotUniqueError as e:
        current_app.logger.error(f"NotUniqueError: {e}")
        return jsonify({"error": "Este email já está registado"}), 409
    except Exception as e:
        current_app.logger.error(f"Exception during save: {e}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Erro ao registar subscrição: {str(e)}"}), 500

@newsletter_bp.route("/verify/<token>", methods=["GET"])
def verify_subscription(token):
    """Verify email subscription with token"""
    current_app.logger.info(f"Verification attempt with token: {token}")
    
    if not token:
        current_app.logger.info("No token provided")
        return jsonify({"error": "Token inválido"}), 400
    
    try:
        # URL decode the token in case it has been encoded
        import urllib.parse
        decoded_token = urllib.parse.unquote(token)
        current_app.logger.info(f"Decoded token: {decoded_token}")
        
        subscription = Newsletter.objects(verification_token=decoded_token).first()
        current_app.logger.info(f"Found subscription: {subscription is not None}")
        
        if not subscription:
            current_app.logger.info("No subscription found with this token")
            # Also try with the original token in case it wasn't encoded
            subscription = Newsletter.objects(verification_token=token).first()
            current_app.logger.info(f"Found subscription with original token: {subscription is not None}")
        
        if not subscription:
            current_app.logger.info("No subscription found with either token")
            # Token not found - might be already verified. Let's check by looking for verified subscriptions
            # This helps provide a better user experience
            return jsonify({"error": "Token inválido ou expirado. Se já verificou o seu email, a sua subscrição já está ativa."}), 400
        
        current_app.logger.info(f"Subscription found: {subscription.email}, verified: {subscription.is_verified}")
        current_app.logger.info(f"Token expiry: {subscription.token_expiry}")
        
        # Check if already verified
        if subscription.is_verified:
            current_app.logger.info(f"Subscription already verified for {subscription.email}")
            return jsonify({"message": "Este email já foi verificado anteriormente. A sua subscrição está ativa."}), 200
        
        if subscription.token_expiry and subscription.token_expiry < datetime.now():
            current_app.logger.info("Token expired")
            return jsonify({"error": "Token expirado. Por favor subscreva novamente."}), 400
        
        # Verify subscription
        subscription.is_verified = True
        subscription.verified_at = datetime.now()
        subscription.verification_token = None
        subscription.token_expiry = None
        subscription.last_updated = datetime.now()
        subscription.save()
        
        current_app.logger.info(f"Subscription verified successfully for {subscription.email}")
        return jsonify({"message": "Email verificado com sucesso. A sua subscrição está ativa."}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error during verification: {str(e)}")
        return jsonify({"error": f"Erro ao verificar subscrição: {str(e)}"}), 500

@newsletter_bp.route("/unsubscribe/<token>", methods=["GET"])
def unsubscribe(token):
    """Unsubscribe from newsletter"""
    if not token:
        return jsonify({"error": "Token inválido"}), 400
    
    try:
        subscription = Newsletter.objects(unsubscribe_token=token).first()
        
        if not subscription:
            return jsonify({"error": "Token inválido"}), 400
        
        # Delete subscription
        email = subscription.email  # Save email for response
        subscription.delete()
        
        return jsonify({"message": f"O email {email} foi removido com sucesso da nossa lista."}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao cancelar subscrição: {str(e)}"}), 500

@newsletter_bp.route("/subscriptions", methods=["GET"])
@jwt_required()
def get_subscriptions():
    """Get all newsletter subscriptions (ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    if current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    # Check if export is requested
    export_format = request.args.get("export")
    if export_format == "csv":
        return export_all_subscriptions()
    
    # Pagination parameters
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    
    # Filters
    verified_only = request.args.get("verified", "").lower() == "true"
    municipio_id = request.args.get("municipio_id")
    search_query = request.args.get("q", "").strip()
    
    # Build query
    query = {}
    if verified_only:
        query["is_verified"] = True
    if municipio_id:
        try:
            municipio = Municipio.objects.get(id=municipio_id)
            query["municipios"] = municipio
        except (DoesNotExist, ValidationError):
            pass
    
    # Add search functionality
    if search_query:
        from mongoengine import Q
        search_filter = Q(name__icontains=search_query) | Q(email__icontains=search_query)
        query_obj = Newsletter.objects(**query).filter(search_filter)
    else:
        query_obj = Newsletter.objects(**query)
    
    # Get total count
    total = query_obj.count()
    
    # Get paginated subscriptions
    subscriptions = query_obj.skip((page-1)*per_page).limit(per_page).order_by("-subscription_date")
    
    subscription_list = []
    for sub in subscriptions:
        municipio_list = [{"id": str(m.id), "name": m.name} for m in sub.municipios]
        
        subscription_list.append({
            "id": str(sub.id),
            "name": sub.name,
            "email": sub.email,
            "municipios": municipio_list,
            "is_verified": sub.is_verified,
            "subscription_date": sub.subscription_date.isoformat() if sub.subscription_date else None,
            "last_updated": sub.last_updated.isoformat() if sub.last_updated else None
        })
    
    return jsonify({
        "subscriptions": subscription_list,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page  # Ceiling division
    }), 200

def export_all_subscriptions():
    """Export all newsletter subscriptions as CSV (ADMIN ONLY)"""
    # Only export verified subscriptions
    verified_only = request.args.get("verified", "true").lower() == "true"
    
    query = {}
    if verified_only:
        query["is_verified"] = True
    
    subscriptions = Newsletter.objects(**query).order_by("email")
    
    # Create CSV content
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Nome", "Email", "Verificado", "Data de Subscrição", 
        "Última Atualização", "Municípios"
    ])
    
    # Write data
    for sub in subscriptions:
        municipios_str = ", ".join([m.name for m in sub.municipios]) if sub.municipios else ""
        
        writer.writerow([
            sub.name or "",
            sub.email,
            "Sim" if sub.is_verified else "Não",
            sub.subscription_date.strftime("%Y-%m-%d %H:%M:%S") if sub.subscription_date else "",
            sub.last_updated.strftime("%Y-%m-%d %H:%M:%S") if sub.last_updated else "",
            municipios_str
        ])
    
    output.seek(0)
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=all_newsletter_subscriptions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response.headers["Content-type"] = "text/csv"
    
    return response

@newsletter_bp.route("/subscriptions/<subscription_id>", methods=["DELETE"])
@jwt_required()
def delete_subscription(subscription_id):
    """Delete a subscription (ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    if current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    try:
        subscription = Newsletter.objects.get(id=subscription_id)
        subscription.delete()
        
        return jsonify({"message": "Subscrição removida com sucesso"}), 200
        
    except DoesNotExist:
        return jsonify({"error": "Subscrição não encontrada"}), 404
    except ValidationError:
        return jsonify({"error": "ID inválido"}), 400
    except Exception as e:
        return jsonify({"error": f"Erro ao remover subscrição: {str(e)}"}), 500

@newsletter_bp.route("/subscriptions", methods=["POST"])
@jwt_required()
def create_subscription():
    """Create a new subscription (ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    if current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    # Validate request data
    validated_data, error_response = validate_request_data()
    if error_response:
        return error_response
    
    # Check if email already exists
    existing_subscription = Newsletter.objects(email=validated_data["email"]).first()
    if existing_subscription:
        return jsonify({"error": "Este email já está registado"}), 409
    
    try:
        # Create subscription as verified (admin created)
        unsubscribe_token = generate_secure_token()
        
        newsletter = Newsletter(
            name=validated_data["name"],
            email=validated_data["email"],
            municipios=validated_data["municipios"],
            is_verified=True,  # Admin created subscriptions are automatically verified
            unsubscribe_token=unsubscribe_token,
            subscription_ip="admin_created"
        )
        newsletter.save()
        
        return jsonify({
            "message": "Subscrição criada com sucesso",
            "subscription": {
                "id": str(newsletter.id),
                "name": newsletter.name,
                "email": newsletter.email,
                "municipios": [{"id": str(m.id), "name": m.name} for m in newsletter.municipios],
                "is_verified": newsletter.is_verified,
                "subscription_date": newsletter.subscription_date.isoformat()
            }
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Erro ao criar subscrição: {str(e)}"}), 500

@newsletter_bp.route("/subscriptions/<subscription_id>", methods=["PUT"])
@jwt_required()
def update_subscription(subscription_id):
    """Update a subscription (ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    if current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    try:
        subscription = Newsletter.objects.get(id=subscription_id)
    except DoesNotExist:
        return jsonify({"error": "Subscrição não encontrada"}), 404
    except ValidationError:
        return jsonify({"error": "ID inválido"}), 400
    
    # Validate request data
    validated_data, error_response = validate_request_data()
    if error_response:
        return error_response
    
    # Check if email already exists for another subscription
    existing_subscription = Newsletter.objects(email=validated_data["email"], id__ne=subscription_id).first()
    if existing_subscription:
        return jsonify({"error": "Este email já está registado por outra subscrição"}), 409
    
    try:
        # Update subscription
        subscription.name = validated_data["name"]
        subscription.email = validated_data["email"]
        subscription.municipios = validated_data["municipios"]
        subscription.last_updated = datetime.now()
        subscription.save()
        
        return jsonify({
            "message": "Subscrição atualizada com sucesso",
            "subscription": {
                "id": str(subscription.id),
                "name": subscription.name,
                "email": subscription.email,
                "municipios": [{"id": str(m.id), "name": m.name} for m in subscription.municipios],
                "is_verified": subscription.is_verified,
                "subscription_date": subscription.subscription_date.isoformat(),
                "last_updated": subscription.last_updated.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao atualizar subscrição: {str(e)}"}), 500

@newsletter_bp.route("/subscriptions/<subscription_id>/verify", methods=["POST"])
@jwt_required()
def admin_verify_subscription(subscription_id):
    """Manually verify/unverify a subscription (ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    if current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    try:
        subscription = Newsletter.objects.get(id=subscription_id)
    except DoesNotExist:
        return jsonify({"error": "Subscrição não encontrada"}), 404
    except ValidationError:
        return jsonify({"error": "ID inválido"}), 400
    
    data = request.get_json()
    is_verified = data.get("is_verified", True)
    
    try:
        subscription.is_verified = is_verified
        subscription.last_updated = datetime.now()
        
        if is_verified:
            # Clear verification token when manually verifying
            subscription.verification_token = None
            subscription.token_expiry = None
            # Set verified_at if not already set
            if not subscription.verified_at:
                subscription.verified_at = datetime.now()
        else:
            # If unmarking as verified, clear verified_at
            subscription.verified_at = None
        
        subscription.save()
        
        status = "verificada" if is_verified else "não verificada"
        return jsonify({"message": f"Subscrição marcada como {status}"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro ao alterar estado de verificação: {str(e)}"}), 500

@newsletter_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """Get newsletter statistics (ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    if current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    total_subscriptions = Newsletter.objects.count()
    verified_subscriptions = Newsletter.objects(is_verified=True).count()
    
    # Count by municipio
    municipios = Municipio.objects.all()
    municipio_stats = []
    
    for municipio in municipios:
        count = Newsletter.objects(municipios=municipio, is_verified=True).count()
        if count > 0:
            municipio_stats.append({
                "id": str(municipio.id),
                "name": municipio.name,
                "count": count
            })
    
    # Sort by count (descending)
    municipio_stats.sort(key=lambda x: x["count"], reverse=True)
    
    return jsonify({
        "total_subscriptions": total_subscriptions,
        "verified_subscriptions": verified_subscriptions,
        "municipio_stats": municipio_stats
    }), 200

@newsletter_bp.route("/municipio/<municipio_id>/subscriptions", methods=["GET"])
@jwt_required()
def get_municipio_subscriptions(municipio_id):
    """Get newsletter subscriptions for a specific municipio (MUNICIPIO/ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    # Check permissions - admin can access any municipio, municipio users can only access their own
    if current_user["role"] == "municipio":
        if current_user.get("municipio_id") != municipio_id:
            return jsonify({"error": "Acesso negado"}), 403
    elif current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    # Pagination parameters
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    
    # Filters
    verified_only = request.args.get("verified", "").lower() == "true"
    search_query = request.args.get("q", "").strip()
    
    try:
        municipio = Municipio.objects.get(id=municipio_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"error": "Município não encontrado"}), 404
    
    # Build query
    query = {"municipios": municipio}
    if verified_only:
        query["is_verified"] = True
    
    # Add search functionality
    if search_query:
        from mongoengine import Q
        search_filter = Q(name__icontains=search_query) | Q(email__icontains=search_query)
        query_obj = Newsletter.objects(**query).filter(search_filter)
    else:
        query_obj = Newsletter.objects(**query)
    
    # Get total count
    total = query_obj.count()
    
    # Get paginated subscriptions
    subscriptions = query_obj.skip((page-1)*per_page).limit(per_page).order_by("-subscription_date")
    
    subscription_list = []
    for sub in subscriptions:
        municipio_list = [{"id": str(m.id), "name": m.name} for m in sub.municipios]
        
        subscription_list.append({
            "id": str(sub.id),
            "name": sub.name,
            "email": sub.email,
            "municipios": municipio_list,
            "is_verified": sub.is_verified,
            "subscription_date": sub.subscription_date.isoformat() if sub.subscription_date else None,
            "last_updated": sub.last_updated.isoformat() if sub.last_updated else None,
            "last_newsletter_sent": sub.last_newsletter_sent.isoformat() if sub.last_newsletter_sent else None
        })
    
    return jsonify({
        "subscriptions": subscription_list,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,  # Ceiling division
        "municipio": {
            "id": str(municipio.id),
            "name": municipio.name
        }
    }), 200

@newsletter_bp.route("/municipio/<municipio_id>/stats", methods=["GET"])
@jwt_required()
def get_municipio_stats(municipio_id):
    """Get newsletter statistics for a specific municipio (MUNICIPIO/ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    # Check permissions - admin can access any municipio, municipio users can only access their own
    if current_user["role"] == "municipio":
        if current_user.get("municipio_id") != municipio_id:
            return jsonify({"error": "Acesso negado"}), 403
    elif current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    try:
        municipio = Municipio.objects.get(id=municipio_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"error": "Município não encontrado"}), 404
    
    # Calculate statistics
    total_subscriptions = Newsletter.objects(municipios=municipio).count()
    verified_subscriptions = Newsletter.objects(municipios=municipio, is_verified=True).count()
    unverified_subscriptions = total_subscriptions - verified_subscriptions
    
    # Recent subscriptions (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_subscriptions = Newsletter.objects(
        municipios=municipio, 
        subscription_date__gte=thirty_days_ago,
        is_verified=True
    ).count()
    
    # Recent activity (last 7 days)
    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_activity = Newsletter.objects(
        municipios=municipio,
        last_updated__gte=seven_days_ago
    ).count()
    
    return jsonify({
        "municipio": {
            "id": str(municipio.id),
            "name": municipio.name
        },
        "total_subscriptions": total_subscriptions,
        "verified_subscriptions": verified_subscriptions,
        "unverified_subscriptions": unverified_subscriptions,
        "recent_subscriptions_30_days": recent_subscriptions,
        "recent_activity_7_days": recent_activity
    }), 200

@newsletter_bp.route("/municipio/<municipio_id>/export", methods=["GET"])
@jwt_required()
def export_municipio_subscriptions(municipio_id):
    """Export newsletter subscriptions for a specific municipio as CSV (MUNICIPIO/ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    # Check permissions - admin can access any municipio, municipio users can only access their own
    if current_user["role"] == "municipio":
        if current_user.get("municipio_id") != municipio_id:
            return jsonify({"error": "Acesso negado"}), 403
    elif current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    try:
        municipio = Municipio.objects.get(id=municipio_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"error": "Município não encontrado"}), 404
    
    # Only export verified subscriptions
    verified_only = request.args.get("verified", "true").lower() == "true"
    
    query = {"municipios": municipio}
    if verified_only:
        query["is_verified"] = True
    
    subscriptions = Newsletter.objects(**query).order_by("name", "email")
    
    # Create CSV content
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Nome", "Email", "Verificado", "Data de Subscrição", 
        "Última Atualização", "Último Newsletter Enviado"
    ])
    
    # Write data
    for sub in subscriptions:
        writer.writerow([
            sub.name or "",
            sub.email,
            "Sim" if sub.is_verified else "Não",
            sub.subscription_date.strftime("%Y-%m-%d %H:%M:%S") if sub.subscription_date else "",
            sub.last_updated.strftime("%Y-%m-%d %H:%M:%S") if sub.last_updated else "",
            sub.last_newsletter_sent.strftime("%Y-%m-%d %H:%M:%S") if sub.last_newsletter_sent else ""
        ])
    
    output.seek(0)
    
    # Create response
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=newsletter_subscriptions_{municipio.slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response.headers["Content-type"] = "text/csv"
    
    return response

@newsletter_bp.route("/municipio/<municipio_id>/test-send", methods=["POST"])
@jwt_required()
def test_send_newsletter(municipio_id):
    """Send a test newsletter to municipality admin (MUNICIPIO/ADMIN ONLY)"""
    current_user = json.loads(get_jwt_identity())
    
    # Check permissions - admin can access any municipio, municipio users can only access their own
    if current_user["role"] == "municipio":
        if current_user.get("municipio_id") != municipio_id:
            return jsonify({"error": "Acesso negado"}), 403
    elif current_user["role"] != "admin":
        return jsonify({"error": "Acesso negado"}), 403
    
    try:
        municipio = Municipio.objects.get(id=municipio_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"error": "Município não encontrado"}), 404
    
    data = request.get_json()
    if not data or "test_email" not in data:
        return jsonify({"error": "Email de teste é obrigatório"}), 400
    
    test_email = data["test_email"].strip().lower()
    
    # Validate email
    if not test_email or not re.match(EMAIL_REGEX, test_email):
        return jsonify({"error": "Email inválido"}), 400
    
    # Get recent atas for the newsletter content
    recent_atas = Ata.objects(municipio=municipio, status="done").order_by("-date").limit(5)
    
    try:
        # Send test newsletter
        send_test_newsletter(test_email, municipio, recent_atas)
        return jsonify({"message": f"Newsletter de teste enviada para {test_email}"}), 200
    except Exception as e:
        current_app.logger.error(f"Error sending test newsletter: {str(e)}")
        return jsonify({"error": f"Erro ao enviar newsletter de teste: {str(e)}"}), 500

def send_test_newsletter(email, municipio, recent_atas):
    """
    Send a test newsletter to the specified email
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Email configuration from config
        SMTP_SERVER = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        SMTP_PORT = current_app.config.get('SMTP_PORT', 587)
        EMAIL_ADDRESS = current_app.config.get('EMAIL_ADDRESS')
        EMAIL_PASSWORD = current_app.config.get('EMAIL_PASSWORD')
        EMAIL_FROM_NAME = current_app.config.get('EMAIL_FROM_NAME', 'CitiLink')
        
        if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
            current_app.logger.warning(f"Email credentials not configured. Would send test newsletter to {email}")
            raise Exception("Email credentials not configured")
        
        # Create email content
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"CitiLink - Newsletter de Teste - {municipio.name}"
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = email
        
        # Build atas content
        atas_content = ""
        if recent_atas:
            atas_content = "<h3 style='color: #0ea5e9; margin-bottom: 16px;'>Atas Recentes:</h3>"
            for ata in recent_atas:
                ata_date = ata.date.strftime("%d/%m/%Y") if ata.date else "Data não definida"
                ata_title = ata.title or ata.short_title or "Sem título"
                atas_content += f"""
                <div style="margin-bottom: 12px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                    <h4 style="margin: 0 0 4px 0; color: #1f2937; font-size: 14px; font-weight: 600;">{ata_title}</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">Data: {ata_date} | Tipo: {ata.tipo or 'N/A'}</p>
                </div>
                """
        else:
            atas_content = "<p style='color: #6b7280; font-style: italic;'>Nenhuma ata recente disponível.</p>"
        
        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Newsletter de Teste - {municipio.name}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">CitiLink</h1>
                    <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Newsletter de Teste</p>
                </div>
                
                <div style="padding: 30px;">
                    <h2 style="color: #0ea5e9; margin-top: 0; margin-bottom: 16px;">Olá!</h2>
                    
                    <p style="margin-bottom: 16px;">Esta é uma newsletter de teste para <strong>{municipio.name}</strong>.</p>
                    
                    <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                            <strong>📧 Newsletter de Teste</strong><br>
                            Esta é uma demonstração de como as newsletters aparecerão para os subscritores do {municipio.name}.
                        </p>
                    </div>
                    
                    {atas_content}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="font-size: 14px; color: #6b7280; margin: 0;">
                            Esta é uma newsletter de teste enviada através do painel de gestão do CitiLink.
                        </p>
                    </div>
                </div>
                
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                        © 2025 CitiLink. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        text_content = f"""
        CitiLink - Newsletter de Teste - {municipio.name}
        
        Olá!
        
        Esta é uma newsletter de teste para {municipio.name}.
        
        Esta é uma demonstração de como as newsletters aparecerão para os subscritores.
        
        Atas Recentes:
        """
        
        if recent_atas:
            for ata in recent_atas:
                ata_date = ata.date.strftime("%d/%m/%Y") if ata.date else "Data não definida"
                ata_title = ata.title or ata.short_title or "Sem título"
                text_content += f"- {ata_title} ({ata_date})\n"
        else:
            text_content += "Nenhuma ata recente disponível.\n"
        
        text_content += f"""
        
        Esta é uma newsletter de teste enviada através do painel de gestão do CitiLink.
        
        © 2025 CitiLink. Todos os direitos reservados.
        """
        
        # Add both parts to the message
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ADDRESS, email, msg.as_string())
        server.quit()
        
        current_app.logger.info(f"Test newsletter sent successfully to {email}")
        
    except Exception as e:
        current_app.logger.error(f"Error sending test newsletter to {email}: {str(e)}")
        raise

def send_verification_email(email, token):
    """
    Send verification email to user
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Email configuration from config
        SMTP_SERVER = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        SMTP_PORT = current_app.config.get('SMTP_PORT', 587)
        EMAIL_ADDRESS = current_app.config.get('EMAIL_ADDRESS')
        EMAIL_PASSWORD = current_app.config.get('EMAIL_PASSWORD')
        EMAIL_FROM_NAME = current_app.config.get('EMAIL_FROM_NAME', 'CitiLink')
        
        if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
            current_app.logger.warning(f"Email credentials not configured. Would send verification email to {email}")
            raise Exception("Email credentials not configured")
        
        verification_url = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:5173')}/newsletter/verify/{token}"
        
        # Create email content
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "CitiLink - Confirme a sua subscrição da newsletter"
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = email
        
        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Confirme a sua subscrição</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #0ea5e9; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; text-align: center;">CitiLink</h1>
                </div>
                
                <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #0ea5e9; margin-top: 0;">Confirme a sua subscrição</h2>
                    
                    <p>Obrigado por se subscrever à newsletter do CitiLink!</p>
                    
                    <p>Para confirmar a sua subscrição e começar a receber atualizações sobre as decisões municipais, clique no botão abaixo:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" 
                           style="background-color: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Confirmar Subscrição
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
                        <a href="{verification_url}" style="color: #0ea5e9;">{verification_url}</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #666;">
                        Este link expira em 48 horas. Se não fez esta subscrição, pode ignorar este email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
                    <p>© 2025 CitiLink. Todos os direitos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        text_content = f"""
        CitiLink - Confirme a sua subscrição da newsletter
        
        Obrigado por se subscrever à newsletter do CitiLink!
        
        Para confirmar a sua subscrição e começar a receber atualizações sobre as decisões municipais, 
        aceda ao seguinte link:
        
        {verification_url}
        
        Este link expira em 48 horas. Se não fez esta subscrição, pode ignorar este email.
        
        © 2025 CitiLink. Todos os direitos reservados.
        """
        
        # Add both parts to the message
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ADDRESS, email, msg.as_string())
        server.quit()
        
        current_app.logger.info(f"Verification email sent successfully to {email}")
        
    except Exception as e:
        current_app.logger.error(f"Error sending verification email to {email}: {str(e)}")
        # For now, we'll just log the error and continue
        # In production, you might want to handle this differently