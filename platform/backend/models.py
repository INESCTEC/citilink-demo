from mongoengine import (
    connect, Document, StringField, DateTimeField, 
    ReferenceField, ListField, EmbeddedDocumentField, 
    EmbeddedDocument, DoesNotExist, ValidationError, IntField, BooleanField,
    DateField, DictField, URLField, CASCADE, FloatField, EmailField
)
from datetime import datetime


# User (Utilizador [ADMIN/MUNICIPIO]) 
class User(Document):
    name = StringField(required=True, max_length=255)
    email = StringField(required=True, unique=True)
    password_hash = StringField(required=True)
    role = StringField(required=True, choices=["admin", "municipio"])
    municipio = ReferenceField("Municipio", required=False)  # (OPT) Only for municipio users
    
    created_at = DateTimeField(default=datetime.now)

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
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    # optional
    sort = IntField() 

    meta = {
        "collection": "municipio",
        "indexes": ["name", "slug"],
        }

    def __repr__(self):
        return f"<Município {self.name}>"

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
        "indexes": ['date', 'title', 'title_en', 'summary', 'summary_en', 'location', 'municipio', 'tipo', 'status', 'celery_task_id'],
        "ordering": ["-date"],
    }

    def __repr__(self):
        return f"<Ata {self.file_name} (Municipio {self.municipio.id}) - Status: {self.status}>"

    
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
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    # new: list of terms/roles/parties
    mandatos = ListField(EmbeddedDocumentField(Mandato))

    meta = {
        "collection": "participante",
        "indexes": ["name", "municipio"],
        "ordering": ["sort", "name"],
    }

    def __repr__(self):
        return f"<Participante {self.name} - {self.role} ({self.term_start} a {self.term_end}) - Município {self.municipio.id}>"

    
# Topico (Ata / Topico ou Topico)
class Topico(Document):
    title = StringField(required=True, max_length=255, unique=True)  # PT (default)
    title_en = StringField(max_length=255, required=False)           # EN translation
    description = StringField()                                      # PT (default)
    description_en = StringField(required=False)                     # EN translation
    slug = StringField(max_length=255, required=True, unique=True)   # URL-friendly version of the title
    slug_en = StringField(max_length=255, required=False, unique=True)  

    meta = {
        "collection": "topico",
        "indexes": ["title"],
        "ordering": ["title"],
        }

    def __repr__(self):
        return f"<Topico {self.title}>"
    
# Voto (Assunto / Voto)
class Voto(EmbeddedDocument):
    participante = ReferenceField("Participante", required=True)
    tipo = StringField(required=True, choices=["favor", "contra", "abstencao"])
    justificacao= StringField() # (OPT) provavelmente não será necessário
    data = DateTimeField(default=datetime.now)

    def __repr__(self):
        return f"<Voto {self.tipo} por {self.participante.name}>"
    
# Assunto (Ata / Topico / Assunto)
class Assunto(Document):
    title = StringField(required=True, max_length=255)  # PT (default)
    title_en = StringField(max_length=255, required=False)  # EN translation
    deliberacao = StringField(required=False)  # PT (default)
    deliberacao_en = StringField(required=False)  # EN translation
    topico = ReferenceField("Topico", required=True, reverse_delete_rule=3) 
    summary = StringField(required=False)  # PT (default)
    summary_en = StringField(required=False)  # EN translation
    ata = ReferenceField("Ata", required=True, reverse_delete_rule=CASCADE)  
    
    # votos - lista (objetos)
    votos = ListField(EmbeddedDocumentField(Voto))
    # votos - números
    votos_favor = IntField(default=0)      # Votes in favor
    votos_contra = IntField(default=0)     # Votes against 
    abstencoes = IntField(default=0)       # Abstentions
    aprovado = BooleanField(default=True)  # Whether the subject was approved
    priority = StringField(choices=["low", "medium", "high"], default="medium")

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

# Newsletter Subscription
class Newsletter(Document):
    name = StringField(required=False, max_length=255)
    email = EmailField(required=True, unique=True)
    municipios = ListField(ReferenceField("Municipio"))  # List of municipios to receive newsletters from
    is_verified = BooleanField(default=False)  # Email verification status
    verified_at = DateTimeField(required=False)  # When the email was verified
    verification_token = StringField(required=False)  # Token for email verification
    token_expiry = DateTimeField(required=False)  # Expiration date for the verification token
    subscription_date = DateTimeField(default=datetime.now)
    last_updated = DateTimeField(default=datetime.now)
    last_newsletter_sent = DateTimeField(required=False)

    subscription_ip = StringField(required=False)  # IP address of subscriber
    unsubscribe_token = StringField(required=True)  # Token for unsubscribing

    # safety measures   
    last_token_request = DateTimeField(required=False)  # Last time a verification token was requested
    token_request_count = IntField(default=0)  # Number of token requests (for rate limiting)
    verification_request_ip = StringField(required=False)  # IP address of last verification request
    is_locked = BooleanField(default=False)  # Temporarily lock account after too many failed attempts
    lockout_until = DateTimeField(required=False)  # When the lockout expires

    meta = {
        "collection": "newsletter",
        "indexes": ["email", "municipios", "is_verified", "verification_token", "token_expiry"],
    }

    def __repr__(self):
        return f"<Newsletter Subscription: {self.email}>"
    
# Query (keyword search)
class Query(Document):
    query = StringField(required=True, max_length=255)
    count = IntField(default=0) 
    first_seen = DateTimeField(default=datetime.now)
    last_seen = DateTimeField(default=datetime.now)

    meta = {
        "collection": "query",
        "indexes": ["query"],
        "ordering": ["-last_seen"],
    }

    def __repr__(self):
        return f"<Query {self.query} - Count: {self.count}>"


# DevGate Access Control
class DevGate(Document):
    name = StringField(required=True, max_length=100)  # Identifier for the gate (e.g., "demo", "staging")
    password_hash = StringField(required=True)  # Hashed password using bcrypt
    salt = StringField(required=True)  # Salt used for hashing
    is_active = BooleanField(default=True)  # Whether this gate is currently active
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    # Access tracking
    access_count = IntField(default=0)  # Total successful accesses
    last_access = DateTimeField(required=False)  # Last successful access
    last_access_ip = StringField(required=False)  # IP of last access

    meta = {
        "collection": "devgate",
        "indexes": ["name", "is_active"],
    }

    def __repr__(self):
        return f"<DevGate {self.name} - Active: {self.is_active}>"