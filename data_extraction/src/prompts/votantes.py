def query_votantes_def(text, existing_participants=None):
        # Prompt components
        persona = "És especialista em ler e compreender atas de reuniões camarárias. És muito bom a identificar os seus assuntos.\n"
        instruction = "Extrai todos os participantes que votam nos assuntos abordados, sabendo que apenas os vereadores e presidente votam nestas reuniões, juntamente com o respetivo partido.\n"
        context = "Esta extração será usada para tornar a compreensão de atas de reuniões camarárias mais acessível. É importante garantir que todos os vereadores e presidente são registados\n"
        
        # Add reference data if provided
        reference_data = ""
        if existing_participants:
            reference_data = f"""
IMPORTANTE: Aqui estão os participantes conhecidos deste município:
{existing_participants}

Quando identificares participantes no texto, tenta corresponder aos nomes já conhecidos, mesmo que haja pequenas diferenças na escrita ou grafia. Por exemplo, se vires "João Silva" no texto e "João Henrique Silva" na lista conhecida, assume que se trata da mesma pessoa.
            """
        
        data_format = """Cria uma json com o nome de cada participante, cargo e partido. A resposta deve ser apenas o json sem mais NADA \n
        
                {
                "nome": "João Marciano Azinhais Muacho",
                "cargo": "Presidente",
                "partido": PS (ou null se não for mencionado)
                }
        """
        tone = "Tom claro e estruturado.\n"
        data = f"Texto para extrair a informação: {text}"

        # The full prompt - remove and add pieces to view its impact on the generated output
        query_votantes = persona + instruction + context + reference_data + data_format + tone + data

        return query_votantes


json_schema_votantes = {
    "type": "object",
    "properties": {
        "nome": {
            "type": "string",
            "description": "Nome do participante (ex: \"João Marciano Azinhais Muacho\")"
        },
        "cargo": {
            "type": "string",
            "description": "Cargo do participante (ex: \"Presidente\")"
        },
        "partido": {
            "type": ["string", "null"],
            "description": "Partido do participante (ex: \"PS\" ou null se não for mencionado)"
        }
    },
    "required": ["nome", "cargo"]
}