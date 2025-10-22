from flask import Blueprint, request, jsonify
import bcrypt
from datetime import datetime
from models import DevGate
from logger import setup_logger

devgate_bp = Blueprint('devgate', __name__)
logger = setup_logger(__name__)

@devgate_bp.route('/create', methods=['POST'])
def create_devgate():
    """
    Create a new DevGate password (allows multiple passwords per gate name)
    """
    try:
        data = request.get_json()
        if not data or 'password' not in data:
            return jsonify({'error': 'Password is required'}), 400
        
        password = data['password']
        gate_name = data.get('name', 'demo')  # Default to 'demo' gate
        
        # Generate salt and hash the password
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        # Always create a new devgate (allows multiple passwords per gate name)
        devgate = DevGate(
            name=gate_name,
            password_hash=password_hash.decode('utf-8'),
            salt=salt.decode('utf-8'),
            is_active=True
        )
        devgate.save()
        
        logger.info(f"New DevGate '{gate_name}' created (ID: {devgate.id})")
        return jsonify({
            'success': True, 
            'message': f'New DevGate "{gate_name}" password created successfully',
            'id': str(devgate.id)
        }), 201
            
    except Exception as e:
        logger.error(f"Error creating/updating DevGate: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@devgate_bp.route('/verify', methods=['POST'])
def verify_password():
    """
    Verify DevGate password against all active gates with the same name
    """
    try:
        data = request.get_json()
        if not data or 'password' not in data:
            return jsonify({'error': 'Password is required'}), 400
        
        password = data['password']
        gate_name = data.get('name', 'demo')  # Default to 'demo' gate
        
        # Find all active devgates with the specified name
        devgates = DevGate.objects(name=gate_name, is_active=True)
        if not devgates:
            logger.warning(f"No active DevGates found for '{gate_name}'")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Try to verify password against each devgate
        password_bytes = password.encode('utf-8')
        
        for devgate in devgates:
            stored_hash = devgate.password_hash.encode('utf-8')
            
            if bcrypt.checkpw(password_bytes, stored_hash):
                # Password matches this devgate - update access tracking
                devgate.access_count += 1
                devgate.last_access = datetime.now()
                devgate.save()
                
                logger.info(f"Successful DevGate access for '{gate_name}' (ID: {devgate.id})")
                return jsonify({'success': True, 'message': 'Access granted'}), 200
        
        # If we get here, none of the passwords matched
        logger.warning(f"Failed DevGate access attempt for '{gate_name}' - no matching passwords")
        return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        logger.error(f"Error verifying DevGate password: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500