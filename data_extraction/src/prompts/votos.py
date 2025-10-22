def query_votos_def(text, votantes, available_topics=None):
    # Prompt components
    persona = "És especialista em ler e compreender atas de reuniões camarárias. És muito bom a identificar e isolar os seus participantes VOTANTES e respetivos votos.\n"

    instruction = "Extrai todos os votos registados por cada participante em cada assunto, assim como a parte textual onde se encontra esta deliberação. Cria uma lista de objetos JSON, um para cada assunto votado. Identifica também o tópico apropriado para cada assunto.\n"
    
    context = "Esta extração será usada para tornar a compreensão de atas de reuniões camarárias mais acessível. É importante garantir que é registado o ponto de vista correto de cada participante sobre cada tópico. Apenas os vereadores e presidente votam nestas reuniões.\n"
    
    # Build topic reference section
    topic_reference = ""
    if available_topics:
        topic_reference = f"""
TÓPICOS DISPONÍVEIS:
Para classificar cada assunto, usa APENAS um dos seguintes tópicos já definidos no sistema:
{available_topics}

IMPORTANTE: Escolhe sempre o tópico mais apropriado da lista acima. Se nenhum se adequar perfeitamente, escolhe "Outras Informações".
        """
    else:
        topic_reference = """
TÓPICOS PADRÃO:
Para cada assunto votado, identifica o tópico mais apropriado de entre as seguintes categorias: Administração Geral, Finanças e Recursos Humanos; Ambiente; Energia e Telecomunicações; Trânsito, Transportes e Comunicações; Educação e Formação Profissional; Património; Cultura; Ciência; Saúde; Proteção Animal; Desporto; Ação Social; Habitação; Proteção Civil; Polícia Municipal; Obras Públicas; Ordenamento do Território; Obras Particulares; Atividades Económicas; Cooperação Externa e Relações Internacionais; Comunicação e Relações Públicas; Outros.
        """
    
    data_format = """Cria uma lista de objetos JSON onde, para cada assunto, é apresentado o voto de cada um dos participantes votantes (favor, contra, abstencao ou ausente). Certifica-te de incluir todos os campos obrigatórios.\n
    [
        {
            "assunto": "CONSTITUIÇÃO DE FUNDOS DE MANEIO PARA O ANO DE 2023",
            "topico": "Administração Geral",
            "votos": [
                {"participante": "Luis Fernando Martins Rosinha", "tipo": "favor"},
                {"participante": "Paulo Ivo Sabino Martins de Almeida", "tipo": "favor"},
                {"participante": "Paulo Jorge Furtado Pinheiro", "tipo": "favor"},
                {"participante": "Fátima do Rosário Pingo Vitorino Pereira", "tipo": "favor"}
            ],
            "deliberacao": "DELIBERADO APROVAR POR UNANIMIDADE"
        },
        {
            "assunto": "ESCALA DE TURNOS DE SERVIÇOS DAS FARMÁCIAS PARA O ANO DOIS MIL E VINTE E DOIS",
            "topico": "Finanças e Recursos Humanos",
            "votos": [
                {"participante": "Luis Fernando Martins Rosinha", "tipo": "favor"},
                {"participante": "Paulo Ivo Sabino Martins de Almeida", "tipo": "abstencao"},
                {"participante": "Paulo Jorge Furtado Pinheiro", "tipo": "favor"},
                {"participante": "Maria da Encarnação Grifo Silveirinha", "tipo": "favor"},
                {"participante": "Fátima do Rosário Pingo Vitorino Pereira", "tipo": "abstencao"}
            ],
            "deliberacao": "EM FACE DA INFORMAÇÃO DA DIVISÃO ADMINISTRATIVA E FINANCEIRA, A CÂMARA DELIBEROU POR MAIORIA, COM A ABSTENÇÃO DO SENHORES VEREADORES PAULO IVO FÁTIMA VITORIMO, DAR PARECER FAVORÁVEL À ESCALA DE TURNOS DE SERVIÇOS DAS FARMÁCIAS PARA O ANO DOIS MIL E VINTE E DOIS."
        }
    ]\n
    Todos os vereadores e presidente votam nestes temas, a menos que se tenham ausentado nesse momento. Garante que isto é registado.\n
    Expressões como "executivo municipal aprovou por unanimidade", ou "todos os presentes votaram favoravelmente" devem ser registadas como um voto a favor de todos os participantes na reunião.\n

    """
    
    tone = "Tom claro, rigoroso e estruturado. Responde apenas com a lista JSON válida, sem explicações adicionais.\n"
    
    data = f"Texto para extrair a informação: {text}"
    history = f"Anteriormente identificaste os vereadores e presidentes como sendo {votantes}."
    
    extra_instructions = """
    IMPORTANTE: 
    1. A resposta deve ser uma lista de objetos JSON válida
    2. O texto anonimizado com asteriscos, por exemplo, "PROCESSO DE OBRAS N.º **** -- EDIFIC", deve ser extraído de forma exata, mantendo a anonimização.
    3. Cada objeto deve ter todos os campos obrigatórios: assunto, topico, votos, e deliberacao
    4. O campo "votos" deve ser uma lista de objetos com "participante" e "tipo"
    5. Usa sempre os nomes EXATOS dos participantes conforme identificados anteriormente
    6. Não incluas comentários nem explicações, apenas a lista JSON em formato válido
    7. Os tipos de voto devem ser apenas: "favor", "contra" ou "abstencao"
    8. O assunto normalmente é apresentado em maiúsculas e não deve ser demasiado extenso (nunca mais do que 100 palavras)
    """

    # The full prompt
    query_votos = persona + instruction + context + topic_reference + data_format + tone + data + history + extra_instructions

    return query_votos

    return query_votantes_stance


# JSON schema for validation
json_schema_votos = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "assunto": {
                "type": "string",
                "description": "Título do assunto que foi votado"
            },
            "topico": {
                "type": "string",
                "description": "Topico associado ao assunto",
                "enum": [
                    "Administração Geral",
                    "Finanças e Recursos Humanos",
                    "Ambiente",
                    "Energia",
                    "Trânsito",
                    "Transportes e Comunicações", 
                    "Educação e Formação Profissional",
                    "Patrimônio",
                    "Cultura",
                    "Ciência",
                    "Desporto",
                    "Saúde",
                    "Proteção Animal",
                    "Ação Social",
                    "Habitação",
                    "Proteção Civil",
                    "Polícia Municipal",
                    "Obras Públicas",
                    "Ordenamento do Território",
                    "Obras Particulares e Urbanismo",
                    "Atividades Econômicas",
                    "Cooperação Externa e Relações Internacionais",
                    "Comunicação e Relações Públicas",
                    "Outras Informações"
                ]
            },
            "votos": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "participante": {
                            "type": "string",
                            "description": "Nome completo do participante que votou"
                        },
                        "tipo": {
                            "type": "string",
                            "description": "Tipo de voto",
                            "enum": ["favor", "contra", "abstencao"]
                        }
                    },
                    "required": ["participante", "tipo"]
                }
            },
            "deliberacao": {
                "type": "string",
                "description": "Texto que descreve a deliberação final sobre o assunto"
            }
        },
        "required": ["assunto", "topico", "votos", "deliberacao"]
    }
}