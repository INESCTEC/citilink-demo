"""Prompt templates for extracting metadata from municipal meeting minutes."""

def query_metadados_def(text):

    # Prompt components
    persona = "És especialista em ler e compreender atas de reuniões camarárias. És muito bom a identificar os metadados das reuniões a partir do texto.\n"
    instruction = "Extrai os seguintes metadados: titulo; data (formato YYYY-MM-DDTHH:MM:SS); hora do fim (formato HH:MM:SS, geralmente encontra-se no final da ata); local onde se realizou; municipio a que pertence (entre Alandroal, Campo Maior, Covilhã, Fundão, Guimarães e Porto); tipo (extraordinaria ou ordinaria); pequeno resumo da reuniao (max 100 palavras).\n"
    context = "Esta extração será usada para tornar a compreensão de atas de reuniões camarárias mais acessível. É importante garantir que todos os vareadores e presidente sao registados\n"
    data_format = """ Cria uma JSON exatamente com estes campos.\n
    {
            "titulo": "Título da reunião" (por exemplo "REUNIÃO ORDINÁRIA 22/10/2021 ATA N.º 1 – Mandato 2021-2025 CÂMARA MUNICIPAL DE ALANDROAL"),
            "data" : "AAAA-MM-DDTHH:MM:SS",
            "hora_fim": "HH:MM:SS" (hora do fim da reunião, geralmente no final da ata),
            "local": "Local onde se realizou a reunião",
            "municipio": "Nome do município (Alandroal, Campo Maior, Covilhã, Fundão, Guimarães ou Porto)",
            "tipo": "Tipo de reunião (extraordinaria, ordinaria, privada)",
            "summary": Resumo da reunião (maximo 100 palavras)"
    }\n
    
    Se não conseguires identificar algum dos metadados, coloca o valor como "N/A".\n
    A resposta deve ser apenas o JSON, sem mais explicações ou texto adicional.\n
    Segue o JSON estritamente {json_schema_metadados} \n

    """
    
    tone = "Tom claro e estruturado.\n"
    data = f"Texto para extrair a informação: {text}"

    # The full prompt
    query_metadados = persona + instruction + context + data_format + tone + data

    return query_metadados


def query_metadados_ordemdia_def(text):

    # Prompt components
    persona = "És especialista em ler e compreender atas de reuniões camarárias. És muito bom a identificar os metadados das reuniões a partir do texto.\n"
    instruction = "Extrai os seguintes metadados: titulo; data (formato YYYY-MM-DDTHH:MM:SS); local onde se realizou; municipio a que pertence (entre Alandroal, Campo Maior, Covilhã, Fundão, Guimarães e Porto); tipo (extraordinaria ou ordinaria); pequeno resumo da reuniao (max 100 palavras).\n"
    context = "Esta extração será usada para tornar a compreensão de atas de reuniões camarárias mais acessível. É importante garantir que todos os vareadores e presidente sao registados\n"
    data_format = """ Cria uma JSON exatamente com estes campos.\n
    {
            "titulo": "Título da reunião" (por exemplo "REUNIÃO ORDINÁRIA 22/10/2021 ATA N.º 1 – Mandato 2021-2025 CÂMARA MUNICIPAL DE ALANDROAL"),
            "data" : "AAAA-MM-DD",
            "numero": "Número da ata, retirada do titulo (ex: 1, 2, 3, ...)",
            "municipio": "Nome do município (Alandroal, Campo Maior, Covilhã, Fundão, Guimarães ou Porto)",
            "tipo": "Tipo de reunião (extraordinaria ou ordinaria)",
    }\n
    Se não conseguires identificar algum dos metadados, coloca o valor como "N/A".\n
    A resposta deve ser apenas o JSON, sem mais explicações ou texto adicional.\n
    Segue o JSON estritamente {json_schema_metadados} \n
    """
    
    tone = "Tom claro e estruturado.\n"
    data = f"Texto para extrair a informação: {text}"

    # The full prompt
    query_metadados = persona + instruction + context + data_format + tone + data

    return query_metadados

json_schema_metadados = {
    "type": "object",
    "properties": {
        "titulo": {
            "type": "string",
            "description": "Título da reunião (por exemplo \"REUNIÃO ORDINÁRIA 22/10/2021 ATA N.º 1 – Mandato 2021-2025 CÂMARA MUNICIPAL DE ALANDROAL\")"
        },
        "data": {
            "type": "string", 
            "description": "Data da reunião no formato AAAA-MM-DD"
        },
        "hora_fim": {
            "type": "string",
            "description": "Hora do fim da reunião no formato HH:MM:SS"
        },
        "local": {
            "type": "string",
            "description": "Local onde se realizou a reunião"
        },
        "numero": {
            "type": "string",
            "description": "Número da ata, retirada do titulo (ex: 1, 2, 3, ...)"
        },
        "municipio": {
            "type": "string",
            "description": "Nome do município (Alandroal, Campo Maior, Covilhã, Fundão, Guimarães ou Porto)",
            "enum": ["Alandroal", "Campo Maior", "Covilhã", "Fundão", "Guimarães", "Porto"]
        },
        "tipo": {
            "type": "string",
            "description": "Tipo de reunião (extraordinaria ou ordinaria)",
            "enum": ["extraordinaria", "ordinaria"]
        },
        "summary": {
            "type": "string",
            "description": "Resumo da reunião (maximo 100 palavras)"
        }
    },
    "required": ["titulo", "data", "hora_fim", "local", "numero", "municipio", "tipo", "summary"]
}