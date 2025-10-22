from flask import Blueprint, send_from_directory, current_app
import os

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/municipios/<municipality_name>/<filename>')
def get_municipality_image(municipality_name, filename):
    """Serve municipality images from the uploads directory."""
    try:
        municipality_folder = os.path.join(current_app.config['CM_FOLDER'], municipality_name)
        current_app.logger.debug(f"Looking in {municipality_folder} for {filename}")
        return send_from_directory(municipality_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving municipality image: {str(e)}")
        return "Image not found", 404

@uploads_bp.route('/participantes/<municipio_name>/<filename>')
def get_participant_image(municipio_name, filename):
    """Serve participant images from the uploads directory."""
    try:
        participant_folder = os.path.join(current_app.config['PARTICIPANTES_FOLDER'], municipio_name)
        current_app.logger.debug(f"Looking in {participant_folder} for {filename}")
        return send_from_directory(participant_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving participant image: {str(e)}")
        return "Image not found", 404

@uploads_bp.route('/atas/<municipio_name>/<filename>')
def get_ata_file(municipio_name, filename):
    """Serve ata files from the uploads directory."""
    try:
        atas_folder = os.path.join(current_app.config['ATAS_FOLDER'], municipio_name)
        current_app.logger.debug(f"Looking in {atas_folder} for {filename}")
        return send_from_directory(atas_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving ata file: {str(e)}")
        return "File not found", 404

@uploads_bp.route('/temp/<filename>')
def get_temp_file(filename):
    """Serve temporary files."""
    try:
        temp_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'temp')
        current_app.logger.debug(f"Looking in {temp_folder} for {filename}")
        return send_from_directory(temp_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving temporary file: {str(e)}")
        return "File not found", 404