![CitiLink Logo](./docs/assets/header.png)

# CitiLink - Enhancing Municipal Transparency and Citizen Engagement through Searchable Meeting Minutes

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![Python 3.10](https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Flask](https://img.shields.io/badge/Backend-Flask-black.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/UI-TailwindCSS-38B2AC.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![LLM: Gemini 2.0 Flash](https://img.shields.io/badge/LLM-Gemini%202.0%20Flash-4285F4.svg?logoColor=white)](https://deepmind.google/technologies/gemini/)


Official repository for the ECIR 2026 demo paper: **"CitiLink: Enhancing Municipal Transparency and Citizen Engagement through Searchable Meeting Minutes"**.

This repository contains the code and instructions to run the CitiLink platform demo locally and reproduce the data extraction pipeline.

> **Try the Live Demo**: [https://demo.citilink.inesctec.pt/en](https://demo.citilink.inesctec.pt/en)


## Overview

CitiLink demonstrates how Natural Language Processing (NLP) and Information Retrieval (IR) techniques can transform unstructured municipal meeting minutes into accessible, searchable, and transparent public records.

**The Problem:** Municipal meeting minutes are often lengthy, unstructured documents that are difficult to navigate and search, creating barriers to transparency and civic engagement.

**Our Solution:** CitiLink uses an LLM-based extraction pipeline (Gemini 2.0 Flash) to automatically extract structured information from PDF meeting minutes—including metadata, discussion subjects, and voting outcomes—and presents them through an intuitive, searchable web interface.

**Demonstration Scope:** The platform processes meeting minutes from 6 Portuguese municipalities: Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto.

**Project Status:** The platform is under active development with a fully functional demo available online.


## Live Demo

**Access the platform**: [https://demo.citilink.inesctec.pt/en](https://demo.citilink.inesctec.pt/en)

The online demo features 120 processed meeting minutes demonstrating the full capabilities of the system, including:
- Full-text search across all documents
- Faceted filtering by municipality, date, topic, and participants
- Structured visualization of meetings, subjects, and voting outcomes
- Topic-based exploration and navigation


## Architecture

![CitiLink Architecture](docs/diagrams/architecture.png)

The CitiLink architecture combines a data extraction pipeline powered by an LLM (Gemini 2.0 Flash), a Flask-based API, a React front-end web application, and a restricted back office for human-in-the-loop validation (available in the online demo).

Each meeting minute is processed through the LLM with prompt engineering to extract metadata, discussion subjects, and voting outcomes. Extracted entities are cross-referenced with predefined database collections to ensure consistency. All processed data is stored in a MongoDB Atlas instance, enabling full-text and faceted search capabilities.

The React-based front end allows users to explore minutes by municipality, topic, or participant, while the Flask API provides structured access to the processed data.


## Technology Stack

- **Languages**: Python, JavaScript
- **Frameworks**: Flask, React, Tailwind CSS
- **Database**: MongoDB Atlas
- **Infrastructure**: Docker, Vite, Nginx
- **AI/ML**: Google Gemini 2.0 Flash


## Dataset

This repository includes **6 meeting minutes** (one from each municipality: Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto) for local experimentation with the processing pipeline.

The complete dataset with **120 meeting minutes**, used in the online demo, is available in a separate repository: [https://github.com/inesctec/citilink-dataset](https://github.com/inesctec/citilink-dataset)


## Running the Demo Locally

### Prerequisites

- Docker and Docker Compose installed
- Git for cloning the repository

### Quick Start
```bash
# Clone the repository
git clone https://github.com/inesctec/citilink-demo.git
cd citilink-demo

# Navigate to platform directory
cd platform

# Start all services
docker-compose up -d
```

The platform will be available at:
- **Web Interface**: http://localhost
- **API Documentation**: http://localhost:5059/api/docs

The Docker Compose setup includes MongoDB database with sample meeting minutes, Flask backend API, React frontend application, and Nginx reverse proxy.

### Stopping the Demo
```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```


## Data Extraction Pipeline

> **Detailed Documentation**: For comprehensive instructions including database management, troubleshooting, and advanced processing options, see [`data_extraction/README.md`](data_extraction/README.md).

To process additional meeting minutes or reproduce the extraction pipeline locally:

### Setup
```bash
# Navigate to data extraction directory
cd data_extraction

# Install dependencies (listed in requirements.txt)
pip install -r requirements.txt
```

### Configuration

Create a `.env` file with your settings:
```bash
# Google AI API Configuration
GOOGLE_API_KEY=your_google_api_key_here
MODEL_NAME=gemini-2.0-flash

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27018
MONGO_DB=citilink_demo
MONGO_COLLECTION=atas

# Processing Settings
MAX_RETRIES=3
CHUNK_SIZE=20000
MAX_DOCUMENT_LENGTH=30000
```

### Processing Documents

The repository includes one document from each municipality (six in total). To process documents:
```bash
# Process a specific municipality
python -m src.main --municipality Porto --years 2023

# Process multiple years
python -m src.main --municipality Porto --years 2021 2022 2023

# Limit number of documents
python -m src.main --municipality Guimarães --years 2023 --limit 5
```

Note: Gemini API rate limits may affect processing speed when handling large document batches.


## Project Structure

```
citilink-demo/
├── data_extraction/          # Municipal minute document processing
│   ├── src/
│   │   ├── processors/       # Document processors
│   │   ├── models/           # Database schemas
│   │   ├── prompts/          # Gemini Prompts
│   │   └── utils/            # Utilities
│   ├── scripts/              # Management scripts
│   └── data/                 # Input documents
│
└── platform/                 # Web platform
    ├── backend/              # Flask API server
    ├── frontend/             # React application
    ├── nginx/                # Reverse proxy config
    ├── mongodb/              # MongoDB database config
    └── docker-compose.yml    # Docker compose setup
```


## License

This project is licensed under the CC-BY-NC-ND-4.0 License - see the [LICENSE](LICENSE) file for details.


## Acknowledgements

### Development

The CitiLink platform was developed by the [NLP&IR](https://nlp.inesctec.pt) team at [INESC TEC](https://www.inesctec.pt/pt) (Institute for Systems and Computer Engineering, Technology and Science).

### Affiliations

- [University of Beira Interior (UBI)](https://www.ubi.pt/)
- [University of Porto (UP)](https://www.up.pt/)
- [Portuguese Foundation for Science and Technology (FCT)](https://www.fct.pt/)
- [LabCom](https://www.labcom.ubi.pt/)
- [Transdisciplinary Culture, Space and Memory Research Centre (CITCEM)](https://citcem.org/)
- [Ci2 Smart Cities Research Center](http://www.ci2.ipt.pt/pt/home/)

### Data Providers

We thank the municipalities of Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto for providing their meeting minutes publicly and for their collaboration throughout the project.

### Team

We acknowledge all team members and contributors who participated in the development, testing, and deployment of the CitiLink platform.

### Funding

This work was funded within the scope of the project  CitiLink, with reference [2024.07509.IACDC](https://doi.org/10.54499/2024.07509.IACDC), which is co-funded by Component 5 - Capitalization and Business Innovation, integrated in the Resilience Dimension of the Recovery and Resilience Plan within the scope of the Recovery and Resilience Mechanism (MRR) of the European Union (EU), framed in the Next Generation EU, for the period 2021 - 2026, measure RE-C05-i08.M04 - "To support the launch of a programme of R&D projects geared towards the development and implementation of advanced cybersecurity, artificial intelligence and data science systems in public administration, as well as a scientific training programme", as part of the funding contract signed between the Recovering Portugal Mission Structure (EMRP) and the FCT - Fundação para a Ciência e a Tecnologia, I.P. (Portuguese Foundation for Science and Technology), as intermediary beneficiary.


## Additional Resources

- **Project Website**: [https://citilink.inesctec.pt](https://citilink.inesctec.pt/)
- **Dataset Repository**: [https://github.com/inesctec/citilink-dataset](https://github.com/inesctec/citilink-dataset)
- **Usability Evaluation Guide**: See `docs/platform_usability_evaluation_guide.docx`


## Contact

For questions, support, or collaboration inquiries:

**Email**: citilink@inesctec.pt