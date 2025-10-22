# CitiLink - Data Extraction

## 1. Project Setup

### Prerequisites
- Python 3.10+
- MongoDB installed and running
- Google Gemini API key
- Python virtual environment (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd citilink_nlp/src/data_generation_program
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # On Linux/macOS:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**

   Create a `.env` file in the project root with:
   ```env
   # Google Gemini API configuration
   GOOGLE_API_KEY=your_google_api_key_here
   MODEL_NAME=gemini-2.0-flash

   # MongoDB configuration (optional, defaults provided)
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB=citilink

   # Processing settings (optional)
   MAX_RETRIES=3
   CHUNK_SIZE=20000
   MAX_DOCUMENT_LENGTH=30000
   ```

### Required Python Packages

The main dependencies include:
- `google-generativeai` - Google Gemini API client
- `mongoengine` - MongoDB ODM
- `python-dotenv` - Environment variable management
- `retrying` - Retry logic for API calls
- `pytest` - Testing framework
- `python-docx` - Document processing
- `colorlog` - Enhanced logging
- `scikit-learn`, `pandas`, `matplotlib`, `seaborn` - Data analysis and visualization

## 2. Running the Application

The application processes meeting minutes from text files using Google Gemini AI and stores the extracted data in MongoDB.

### Basic Usage

```bash
python -m src.main
```

This runs the application with default settings (processes files from 2021).

### Command Line Options

```bash
python -m src.main --years 2021 2022 --limit 5 --municipality Porto
```

#### Available Options:

| Option | Description | Example |
|--------|-------------|---------|
| `--years` | Years to process | `--years 2021 2022 2023` |
| `--limit` | Maximum number of files per year | `--limit 10` |
| `--municipality` | Specific municipality to process | `--municipality Porto` |
| `--ata` | Specific ata to process | `--ata "050"` |
| `--clear-db` | Clear database before processing | `--clear-db` |
| `--force-generate` | Regenerate JSON files even if they exist | `--force-generate` |

### Processing Examples with Real Data

The application includes data from 6 Portuguese municipalities (120 files total, 20 per municipality):

#### Process all files from Porto in 2024:
```bash
python -m src.main --municipality Porto --years 2024
```

#### Process specific ata from Campo Maior:
```bash
# Process ata 002 from Campo Maior in 2024
python -m src.main --municipality CampoMaior --years 2024 --ata "002"
```

#### Process multiple years from Guimarães with a limit:
```bash
python -m src.main --municipality Guimaraes --years 2021 2022 2023 --limit 5
```

#### Process all municipalities for a specific year:
```bash
python -m src.main --years 2024 --limit 3
```

#### Force regeneration of existing processed files:
```bash
python -m src.main --municipality Covilha --years 2024 --force-generate
```

#### Clear database and process fresh data:
```bash
python -m src.main --clear-db --municipality Fundao --years 2024
```

### Available Municipalities and Data

The application includes data from the following Portuguese municipalities:

| Municipality | Files Available | 
|--------------|-----------------|
| **Alandroal** | 1 file | 
| **Campo Maior** | 1 file | 
| **Covilhã** | 1 file | 
| **Fundão** | 1 file | 
| **Guimarães** | 1 file | 
| **Porto** | 1 file | 

## 3. Database Management

The project includes a dedicated CLI tool for managing the database contents.

### Using the Database CLI Tool

```bash
python scripts/clear_db.py <command> [options]
```

#### Available Commands:

| Command | Description | Example |
|---------|-------------|---------|
| `clear-all` | Delete all data from database | `python scripts/clear_db.py clear-all` |
| `clear-municipality` | Delete data for a specific municipality | `python scripts/clear_db.py clear-municipality "Porto"` |
| `clear-year` | Delete meetings from a specific year | `python scripts/clear_db.py clear-year 2024` |

#### Options:

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation prompt |
| `--municipality` | Filter by municipality (for clear-year command) |

### Examples:

```bash
# Delete all data (with confirmation prompt)
python scripts/clear_db.py clear-all

# Delete all data for Porto municipality without confirmation
python scripts/clear_db.py clear-municipality "Porto" --force

# Delete all meetings from 2024 for Guimarães
python scripts/clear_db.py clear-year 2024 --municipality "Guimaraes"
```

## 4. Project Structure

```
data_generation_program/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (create this)
├── data/
│   └── extracted_txt_files_structured/  # Municipal meeting minutes
│       ├── municipio_alandroal/
│       ├── municipio_campomaior/
│       ├── municipio_covilha/
│       ├── municipio_fundao/
│       ├── municipio_guimaraes/
│       └── municipio_porto/
├── output/                # Processing outputs
│   ├── processed/         # Generated JSON files
│   └── errors/           # Error logs
├── src/
│   ├── config.py          # Configuration settings
│   ├── main.py            # Main application entry point
│   ├── models/
│   │   └── database.py    # MongoDB models
│   ├── processors/
│   │   ├── file_processor.py    # Text file processor
│   │   ├── content_generator.py # LLM content generation
│   │   ├── model_factory.py     # LLM abstraction
│   │   └── document_chunker.py  # Large document handling
│   ├── prompts/           # prompts for data extraction
│   │   ├── metadados.py   # Metadata extraction
│   │   ├── participantes.py     # Participants extraction
│   │   └── votos.py       # Voting extraction
│   └── utils/
│       └── logging_utils.py     # Logging configuration
├── scripts/
│   └── clear_db.py        # Database management CLI
└── venv/                  # Python virtual environment
```

## 5. Data Model

The application extracts and stores the following structured data from municipal meeting minutes:

### Core Models:
- **Municipio**: Municipality information (name, district, etc.)
- **Ata**: Meeting minutes with metadata (date, type, location, etc.)
- **Participante**: Meeting participants (mayor, councilors, secretaries)
- **Assunto**: Topics/subjects discussed in meetings
- **Voto**: Individual votes on topics (embedded in Assunto)
- **Pelouro**: Departments/portfolios
- **Media**: Associated media files

### Extracted Data Types:
1. **Metadata** (`metadados.json`): Meeting date, type, location, municipality
2. **Participants** (`participantes.json`): List of attendees with roles
3. **Votes** (`votos.json`): Voting records on different topics

## 6. AI-Powered Processing

### Google Gemini Integration
- Uses Google Gemini 2.0 Flash model for content extraction
- Intelligent document chunking for large files
- Retry logic with exponential backoff for API reliability
- JSON schema validation for structured output

### Processing Features:
- **Automatic chunking**: Large documents are intelligently split
- **Error recovery**: Failed API calls are retried with backoff
- **JSON validation**: Output is validated against predefined schemas
- **Portuguese language**: Optimized for Portuguese municipal terminology

## 7. Troubleshooting

### Common Issues:

1. **Google API Errors**
   - Ensure `GOOGLE_API_KEY` is set in your `.env` file
   - Check API quota limits in Google Cloud Console
   - Verify billing is enabled for your Google Cloud project

2. **Database Connection Errors**
   - Ensure MongoDB is running
   - Verify connection settings in `.env` file
   - Check firewall settings if using remote MongoDB

3. **Processing Errors**
   - Check the `output/errors/` directory for detailed error logs
   - Ensure source text files are properly encoded (UTF-8)
   - Verify municipality names match exactly (case-sensitive)

4. **Missing Dependencies**
   - Run `pip install -r requirements.txt` again
   - Create a fresh virtual environment if packages conflict

### Logging

Logs are saved to:
- Console output with color-coded levels
- `output/errors/` - Processing errors with JSON details
- Individual error files for failed processing attempts

To increase logging verbosity, modify `src/utils/logging_utils.py`.

## 8. Performance Tips

- **Chunking**: Large documents are automatically chunked for optimal processing
- **Caching**: AI model instances are cached to reduce initialization overhead
- **Parallel Processing**: Multiple files can be processed in sequence with graceful shutdown
- **Error Recovery**: Failed extractions don't stop the entire batch


---

*Last Updated: October 2025*