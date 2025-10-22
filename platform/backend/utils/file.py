from werkzeug.utils import secure_filename
import subprocess
import os

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def clean_name(name):
    import unicodedata
    import re
    name = unicodedata.normalize("NFKD", name).encode("ASCII", "ignore").decode("utf-8")
    name = re.sub(r"[^\w\s]", "", name)
    name = name.replace(" ", "_")
    return name.lower()

def convert_to_pdf(input_path: str, output_path: str) -> bool:
    """Convert a document to PDF using LibreOffice."""
    try:
        # Use LibreOffice to convert the document to PDF
        result = subprocess.run(
            ["soffice", "--headless", "--convert-to", "pdf", "--outdir", os.path.dirname(output_path), input_path],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error converting to PDF: {result.stderr}")
            return False
            
        # Get the generated PDF filename (LibreOffice uses the same name but with .pdf extension)
        pdf_filename = os.path.splitext(os.path.basename(input_path))[0] + ".pdf"
        generated_pdf = os.path.join(os.path.dirname(output_path), pdf_filename)
        
        # Move the generated PDF to the desired output path
        if os.path.exists(generated_pdf):
            os.rename(generated_pdf, output_path)
            return True
            
        return False
    except Exception as e:
        print(f"Error in PDF conversion: {str(e)}")
        return False