from mongoengine import (
    connect, Document, StringField, DateTimeField, 
    ReferenceField, ListField, EmbeddedDocumentField, 
    EmbeddedDocument, DoesNotExist, ValidationError, IntField, BooleanField,
    DateField, DictField, URLField, CASCADE, FloatField, EmailField
)
from datetime import datetime
from typing import Dict, List


# User (Utilizador [ADMIN/MUNICIPIO]) 
class User(Document):
    name = StringField(required=True, max_length=255)
    email = StringField(required=True, unique=True)
    password_hash = StringField(required=True)
    role = StringField(required=True, choices=["admin", "municipio"])
    municipio = ReferenceField("Municipio", required=False)  # (OPT) Only for municipio users
    
    created_at = DateTimeField(default=datetime.now())

    meta = {
        "collection": "users",
        } 

    def __repr__(self):
        return f"<User {self.name} ({self.role})>"
 
# Municipio (Município) Model
class Municipio(Document):
    name = StringField(required=True, unique=True, max_length=255)  # PT (default)
    name_en = StringField(max_length=255, required=False)  # EN translation
    description = StringField(max_length=512, required=False)  # PT (default)
    description_en = StringField(max_length=512, required=False)  # EN translation
    website = URLField(max_length=255, required=False)
    
    image_filename = StringField(max_length=255, required=False)
    squared_image_filename = StringField(max_length=255, required=False)
    
    # metadata
    slug = StringField(max_length=255, required=True, unique=True)  # URL-friendly version of the name
    created_at = DateTimeField(default=datetime.now())
    updated_at = DateTimeField(default=datetime.now())

    # optional
    sort = IntField() 

    meta = {
        "collection": "municipio",
        "indexes": ["name", "slug"],
        }

    def __repr__(self):
        return f"<Município {self.name}>"
    
    @classmethod
    def get_or_create(cls, name: str, slug: str = None) -> 'Municipio':
        """
        Get or create municipality by name.
        
        Args:
            name: Municipality name
            slug: URL-friendly slug (auto-generated from name if not provided)
            
        Returns:
            Municipio instance
        """
        import unicodedata
        import re
        
        def normalize_text(text: str) -> str:
            """Normalize text for comparison."""
            if not text:
                return ""
            text = text.lower()
            text = unicodedata.normalize('NFD', text)
            text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
            text = re.sub(r'\s+', ' ', text).strip()
            return text
        
        # Normalize municipality name for consistent storage
        name = name.strip()
        if not slug:
            # Generate slug from name - simple version
            slug = name.lower().replace(" ", "-").replace("ã", "a").replace("ç", "c")
        
        try:
            # First, try to find existing municipality by normalized name
            normalized_name = normalize_text(name)
            
            # Try to find by exact name first
            try:
                return cls.objects.get(name=name)
            except DoesNotExist:
                pass
            
            # If not found by exact name, search by normalized name
            for municipio in cls.objects:
                if normalize_text(municipio.name) == normalized_name:
                    return municipio
            
            # If still not found, create new one
            municipio = cls(name=name, slug=slug)
            municipio.save()
            return municipio
            
        except Exception as e:
            import logging
            logging.error(f"Error in get_or_create for municipality '{name}': {str(e)}")
            raise ValueError(f"Failed to get or create municipality '{name}': {str(e)}")

# Ata (Ata)
class Ata(Document):
    short_title = StringField(required=False, max_length=255)  # PT (default)
    short_title_en = StringField(max_length=255, required=False)  # EN translation
    title = StringField(required=False, max_length=255)  # PT (default)
    title_en = StringField(max_length=255, required=False)  # EN translation
    content = StringField(required=False)  # PT (default)
    content_en = StringField(required=False)  # EN translation
    location = StringField(required=False)
    date = DateTimeField(required=False)
    start_datetime = DateTimeField(required=False)
    end_datetime = DateTimeField(required=False)
    municipio = ReferenceField("Municipio", required=False)
    tipo = StringField(required=False, max_length=64, choices=["ordinaria", "extraordinaria"])
    participantes = ListField(ReferenceField("Participante"))
    summary = StringField(required=False)  # PT (default)
    summary_en = StringField(required=False)  # EN translation
    human_validated = BooleanField(default=False)
    processed = BooleanField(default=False)
    processing_errors = ListField(StringField())
    tags = ListField(StringField())
    processed_content = StringField()
    slug = StringField(max_length=255, required=False, unique=True)
    
    file_name = StringField(required=False, max_length=255)
    file_path = StringField(required=False, max_length=512)
    file_size = IntField()
    file_type = StringField(max_length=50)
    uploaded_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    uploaded_by = ReferenceField("User", required=False)
    
    status = StringField(
        choices=["pending", "processing", "processed", "creating", "done", "failed"], 
        default="pending"
    )
    
    pdf_file_name = StringField(max_length=255)
    pdf_file_path = StringField(max_length=512)
    pdf_generated = BooleanField(default=False)
    pdf_generation_error = StringField()
    pages = IntField()
    
    field_validation = DictField(default={
        "title": {"is_valid": False, "validated_at": None, "validated_by": None},
        "content": {"is_valid": False, "validated_at": None, "validated_by": None},
        "date": {"is_valid": False, "validated_at": None, "validated_by": None},
        "location": {"is_valid": False, "validated_at": None, "validated_by": None},
        "tipo": {"is_valid": False, "validated_at": None, "validated_by": None},
        "summary": {"is_valid": False, "validated_at": None, "validated_by": None},
        "participantes": {"is_valid": False, "validated_at": None, "validated_by": None},
        "assuntos": {"is_valid": False, "validated_at": None, "validated_by": None}
    })
    
    celery_task_id = StringField(max_length=255)
    processing_progress = IntField(default=0, min_value=0, max_value=100)
    processing_message = StringField(max_length=255)

    meta = {
        "collection": "ata",
        "indexes": ['date', 'municipio', 'tipo', 'status', 'celery_task_id'],
        "ordering": ["-date"],
    }

    def __repr__(self):
        return f"<Ata {self.file_name} (Municipio {self.municipio.id}) - Status: {self.status}>"
    
    @classmethod
    def create_from_metadata(cls, metadata: Dict, participantes_list: List['Participante'] = None) -> 'Ata':
        """
        Create an Ata instance from extracted metadata.
        
        Args:
            metadata: Dictionary containing metadata extracted from the document
            participantes_list: List of Participante instances to associate with this ata
            
        Returns:
            Ata instance (unsaved)
        """
        ata_data = {}
        
        # Extract known fields from metadata
        if metadata.get("titulo"):
            ata_data["title"] = metadata["titulo"]
        
        if metadata.get("data"):
            try:
                ata_data["date"] = cls._parse_date(metadata["data"])
            except ValueError as e:
                import logging
                logging.warning(f"Failed to parse date '{metadata['data']}': {e}")
        
        if metadata.get("local"):
            ata_data["location"] = metadata["local"]
        
        if metadata.get("summary"):
            ata_data["summary"] = metadata["summary"]
        
        if metadata.get("content"):
            ata_data["content"] = metadata["content"]
        
        # File metadata
        if metadata.get("file_path"):
            ata_data["file_path"] = metadata["file_path"]
            
        if metadata.get("file_name"):
            ata_data["file_name"] = metadata["file_name"]
        
        if metadata.get("tipo"):
            tipo_lower = metadata["tipo"].lower()
            if "ordinaria" in tipo_lower or "ordinária" in tipo_lower:
                ata_data["tipo"] = "ordinaria"
            elif "extraordinaria" in tipo_lower or "extraordinária" in tipo_lower:
                ata_data["tipo"] = "extraordinaria"
            else:
                ata_data["tipo"] = "ordinaria"  # Default
        
        # Add participant list if provided
        if participantes_list:
            ata_data["participantes"] = participantes_list
        
        # Generate unique slug from title if provided
        if metadata.get("titulo"):
            import re
            import unicodedata
            
            # Generate a basic slug from title
            title = metadata["titulo"]
            # Remove accents
            slug = unicodedata.normalize('NFD', title.lower())
            slug = ''.join(char for char in slug if unicodedata.category(char) != 'Mn')
            # Replace non-alphanumeric with hyphens
            slug = re.sub(r'[^a-zA-Z0-9\s-]', '', slug)
            slug = re.sub(r'\s+', '-', slug)
            slug = slug.strip('-')
            
            # Make slug unique
            original_slug = slug
            counter = 1
            while cls.objects.filter(slug=slug).count() > 0:
                slug = f"{original_slug}-{counter}"
                counter += 1
            
            ata_data["slug"] = slug
        
        return cls(**ata_data)
    
    @staticmethod
    def _parse_date(date_str) -> datetime:
        """Parse date string into datetime object."""
        # Common Portuguese date formats
        date_formats = [
            "%d de %B de %Y",         # 15 de janeiro de 2024
            "%d/%m/%Y",               # 15/01/2024
            "%d-%m-%Y",               # 15-01-2024
            "%Y-%m-%d",               # 2024-01-15
            "%d de %b de %Y",         # 15 de jan de 2024
        ]
        
        # Portuguese month names mapping
        portuguese_months = {
            "janeiro": "January", "fevereiro": "February", "março": "March", "abril": "April",
            "maio": "May", "junho": "June", "julho": "July", "agosto": "August",
            "setembro": "September", "outubro": "October", "novembro": "November", "dezembro": "December"
        }
        
        # Replace Portuguese month names with English ones
        date_str_eng = date_str.lower()
        for pt_month, eng_month in portuguese_months.items():
            date_str_eng = date_str_eng.replace(pt_month, eng_month)
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str_eng, fmt.lower())
            except ValueError:
                continue
        
        raise ValueError(f"Unable to parse date: {date_str}")

    
# Mandato (Participante)
class Mandato(EmbeddedDocument):
    role = StringField(required=True, max_length=255)      # Presidente, Vereador, etc.
    role_en = StringField(max_length=255, required=False)  # EN translation
    party = StringField(max_length=255)                    # partido
    term_start = IntField()                                # ano de início do mandato
    term_end = IntField()                                  # ano de fim do mandato
    sort = IntField()                                      # para definir a ordem (Presidente, ...)

# Participante (Participante)
class Participante(Document):
    name = StringField(required=True, max_length=255)  # PT (default)
    municipio = ReferenceField("Municipio", required=True, reverse_delete_rule=CASCADE)
    active = BooleanField(default=True)
    profile_photo = StringField(max_length=512)
    email = StringField(max_length=128)
    description = StringField()  # PT (default)
    description_en = StringField(required=False)  # EN translation
    participante_type = StringField(max_length=100)    # assembleia ou câmara
    slug = StringField(max_length=255, required=True, unique=True)  # URL-friendly version of the name

    # metadata
    image_filename = StringField(max_length=255)
    created_at = DateTimeField(default=datetime.now())
    updated_at = DateTimeField(default=datetime.now())

    # new: list of terms/roles/parties
    mandatos = ListField(EmbeddedDocumentField(Mandato))

    meta = {
        "collection": "participante",
        "indexes": ["name", "municipio"],
        "ordering": ["sort", "name"],
    }

    def __repr__(self):
        return f"<Participante {self.name} - {self.role} ({self.term_start} a {self.term_end}) - Município {self.municipio.id}>"
    
    @classmethod
    def get_or_create(cls, name: str, municipio: 'Municipio', role: str = None, party: str = None, 
                     term_start: int = None, term_end: int = None, **kwargs) -> 'Participante':
        """
        Get or create participant by name and municipality.
        
        Args:
            name: Participant name
            municipio: Municipality instance
            role: Role/position (e.g., "Presidente", "Vereador")
            party: Political party
            term_start: Start year of the term
            term_end: End year of the term
            **kwargs: Additional parameters
            
        Returns:
            Participante instance
        """
        import unicodedata
        import re
        import logging
        
        def normalize_text(text: str) -> str:
            """Normalize text for comparison."""
            if not text:
                return ""
            text = text.lower()
            text = unicodedata.normalize('NFD', text)
            text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
            text = re.sub(r'\s+', ' ', text).strip()
            return text
            
        # Normalize name for consistent storage
        normalized_name = normalize_text(name)
        
        try:
            # Try to find by exact name first
            try:
                participant = cls.objects.get(name=name, municipio=municipio)
                
                # Update mandatos if new information provided
                if role and (not participant.mandatos or 
                           not any(m.role == role for m in participant.mandatos)):
                    mandato = Mandato(
                        role=role,
                        party=party,
                        term_start=term_start,
                        term_end=term_end
                    )
                    participant.mandatos.append(mandato)
                    participant.save()
                
                return participant
                
            except DoesNotExist:
                pass
            
            # Try to find by normalized name
            for participant in cls.objects.filter(municipio=municipio):
                if normalize_text(participant.name) == normalized_name:
                    # Update mandatos if new information provided
                    if role and (not participant.mandatos or 
                               not any(m.role == role for m in participant.mandatos)):
                        mandato = Mandato(
                            role=role,
                            party=party,
                            term_start=term_start,
                            term_end=term_end
                        )
                        participant.mandatos.append(mandato)
                        participant.save()
                    
                    return participant
            
            # If not found, create new participant
            slug = name.lower().replace(" ", "-")
            # Make sure slug is unique
            counter = 1
            original_slug = slug
            while cls.objects.filter(slug=slug).count() > 0:
                slug = f"{original_slug}-{counter}"
                counter += 1
            
            mandatos = []
            if role:
                mandatos.append(Mandato(
                    role=role,
                    party=party,
                    term_start=term_start,
                    term_end=term_end
                ))
            
            participant = cls(
                name=name,
                municipio=municipio,
                slug=slug,
                mandatos=mandatos,
                **kwargs
            )
            participant.save()
            return participant
            
        except Exception as e:
            logging.error(f"Error creating participant '{name}': {str(e)}")
            raise

    
# Topico (Ata / Topico ou Topico)
class Topico(Document):
    title = StringField(required=True, max_length=255, unique=True)  # PT (default)
    title_en = StringField(max_length=255, required=False)  # EN translation
    description = StringField()  # PT (default)
    description_en = StringField(required=False)  # EN translation
    slug = StringField(max_length=255, required=True, unique=True)  # URL-friendly version of the title
    slug_en = StringField(max_length=255, required=False)  

    meta = {
        "collection": "topico",
        "indexes": ["title"],
        "ordering": ["title"],
        }

    def __repr__(self):
        return f"<Topico {self.title}>"
        
    @classmethod
    def get_or_create(cls, title: str, description: str = None, slug: str = None) -> 'Topico':
        """
        Get or create topico by title.
        
        Args:
            title: Topico title
            description: Optional description
            slug: URL-friendly slug (auto-generated if not provided)
            
        Returns:
            Topico instance
        """
        import unicodedata
        import re
        import logging
        
        def normalize_text(text: str) -> str:
            """Normalize text for comparison."""
            if not text:
                return ""
            text = text.lower()
            text = unicodedata.normalize('NFD', text)
            text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
            text = re.sub(r'\s+', ' ', text).strip()
            return text
        
        # Normalize title for consistent storage
        title = title.strip()
        if not slug:
            # Generate slug from title
            slug = title.lower().replace(" ", "-").replace("ã", "a").replace("ç", "c").replace("õ", "o")
        
        try:
            # First, try to find by exact title
            try:
                return cls.objects.get(title=title)
            except DoesNotExist:
                pass
            
            # Try to find by normalized title
            normalized_title = normalize_text(title)
            for topico in cls.objects:
                if normalize_text(topico.title) == normalized_title:
                    return topico
            
            # If not found, create new topico
            # Make sure slug is unique
            counter = 1
            original_slug = slug
            while cls.objects.filter(slug=slug).count() > 0:
                slug = f"{original_slug}-{counter}"
                counter += 1
            
            topico = cls(title=title, slug=slug, description=description)
            topico.save()
            return topico
            
        except Exception as e:
            logging.error(f"Error creating topico '{title}': {str(e)}")
            raise
    
# Voto (Assunto / Voto)
class Voto(EmbeddedDocument):
    participante = ReferenceField("Participante", required=True)
    tipo = StringField(required=True, choices=["favor", "contra", "abstencao"])
    data = DateTimeField(default=datetime.now)

    def __repr__(self):
        return f"<Voto {self.tipo} por {self.participante.name}>"
    
# Assunto (Ata / Topico / Assunto)
class Assunto(Document):
    title = StringField(required=True, max_length=1000)  # PT (default) - Increased length
    title_en = StringField(max_length=1000, required=False)  # EN translation - Increased length
    deliberacao = StringField(required=False)  # PT (default)
    deliberacao_en = StringField(required=False)  # EN translation
    topico = ReferenceField("Topico", required=True, reverse_delete_rule=3) 
    summary = StringField(required=False)  # PT (default)
    summary_en = StringField(required=False)  # EN translation
    ata = ReferenceField("Ata", required=True, reverse_delete_rule=CASCADE)  
    
    # votos - lista (objetos)
    votos = ListField(EmbeddedDocumentField(Voto))
    # votos - números
    votos_favor = IntField(default=0)  # Votes in favor
    votos_contra = IntField(default=0)  # Votes against 
    abstencoes = IntField(default=0)    # Abstentions
    aprovado = BooleanField(default=True)  # Whether the subject was approved
    
    priority = StringField(choices=["low", "medium", "high"], default="low") 

    # metadata
    metadata = DictField()

    meta = {
        "collection": "assunto",
        "indexes": ["title", "topico", "ata"],
        "ordering": ["ata", "title"],
    }

    def __repr__(self):
        return f"<Assunto {self.title} (Topico {self.topico.title}, Ata {self.ata.id})>"
    
    # cáulo dos votos
    def compute_vote_totals(self):
        self.votos_favor = sum(1 for v in self.votos if v.tipo == "favor")
        self.votos_contra = sum(1 for v in self.votos if v.tipo == "contra")
        self.abstencoes = sum(1 for v in self.votos if v.tipo == "abstencao")
        
        # aprovado se tiver mais votos a favor do que contra
        self.aprovado = self.votos_favor > self.votos_contra
        
        # unanime se não houver votos ou se todos os votos forem a favor ou contra (?)
        total_favor_contra = self.votos_favor + self.votos_contra
        self.is_unanime = (total_favor_contra > 0 and 
                          (self.votos_favor == total_favor_contra or 
                           self.votos_contra == total_favor_contra))
        
        return self

class ErrorLog(Document):
    """Model for tracking processing errors."""
    file_path = StringField(required=True)
    file_name = StringField(required=True)
    error_message = StringField(required=True)
    error_phase = StringField()  # Which phase of processing had the error
    timestamp = DateTimeField(required=True)
    
    meta = {
        "collection": "error_log",
        "indexes": ["file_name", "timestamp"],
        "ordering": ["-timestamp"],
    }
    
    @classmethod
    def create(cls, file_path: str, file_name: str, error_message: str, 
               error_phase: str = None, timestamp: datetime = None) -> 'ErrorLog':
        """Create a new error log entry."""
        if timestamp is None:
            timestamp = datetime.now()
        return cls(
            file_path=file_path,
            file_name=file_name,
            error_message=error_message,
            error_phase=error_phase,
            timestamp=timestamp
        ).save()
