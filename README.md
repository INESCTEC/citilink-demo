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

Official repository for the submission of the demo paper "**CitiLink: Enhancing Municipal Transparency and Citizen Engagement through Searchable Meeting Minutes**", for ECIR 2026.

This repository contains the code and instructions to run the CitiLink platform demo and the data extraction process.
   
> **Try CitiLink Now** -- [**https://demo.citilink.inesctec.pt/en**](https://demo.citilink.inesctec.pt/en)

---

CitiLink is a platform that presents structured and searchable data extracted from municipal meeting minutes. It aims to demonstrate how Natural Language Processing (NLP) and Information Retrieval (IR) can make local government documentation more accessible and transparent. 

**What this project does**: In this demo, we focus on the exploration and visualization of meeting minutes from 6 Portuguese municipalities: Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto.
The demonstration is available online at [https://demo.citilink.inesctec.pt/en](https://demo.citilink.inesctec.pt/en), but can also be run locally using Docker (instructions below).

**Who is it for**: This project is intended for local government officials, researchers, journalists, and citizens interested in enhancing transparency and engagement through improved access to municipal meeting records.

**The problem it solves**: Municipal meeting minutes are often lengthy, unstructured documents that are difficult to navigate and search upon. This project leverages NLP and IR techniques to extract key information, then presenting it in a user-friendly manner.


## Project Status

The project is under active development, with a fully functional demo already available.

## Technology Stack

- Languages: Python, JavaScript
- Frameworks: Flask, React, Tailwind CSS
- Database: MongoDB Atlas
- Other tools: Docker, Vite

## Architecture

![CitiLink Architecture](docs/diagrams/architecture.png)

The CitiLink architecture combines a data extraction process, powered by an LLM (Gemini 2.0 Flash), a front-end web application, the respective Flask-based API that feeds the front-end, and a restricted back office for human-in-the-loop validation (available on the online demo). Each minute textual content is processed through the LLM, with adequate prompt engineering, to extract metadata, discussion subjects, and voting outcomes, which are then cross-referenced with predefined database collections to ensure consistency. All the data is then stored in a MongoDB Atlas instance, enabling full-text and faceted search. The React-based front end allows users to explore minutes by municipality, topic, or participant, while a Flask API provides access to the processed data.

### Dataset
> **Important Note**: For demonstration purposes, this repository includes 6 meeting minutes from each of the 6 municipalities (Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto), so users can experiment with the processing step. The complete dataset, present in the [**online demo**](https://demo.citilink.inesctec.pt/en), with 120 minutes is available in the CitiLink Dataset repository ([https://github.com/INESCTEC/citilink-dataset](https://github.com/INESCTEC/citilink-dataset)).

## Dependencies
Listed on `data_extraction/requirements.txt` and `platform/backend/requirements.txt`   

## Installation and Usage
### Platform - Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/inesctec/citilink-demo.git
   cd citilink-demo
   ```

2. **Start with Docker Compose**
   ```bash
   cd platform
   docker-compose up -d
   ```
3. **Access the following URLs in your web browser**
   - Web Interface: http://localhost
   - API Documentation: http://localhost:5059/api/docs
   
### Data Extraction (Manual Setup)

1. **Enter the data_extraction directory**:
   ```
   cd data_extraction
   ```

2. **Install dependencies**:
   ```
   pip install -r requirements.txt
   ```

3. **Fill in the .env file with your Gemini API key and other variables**:
   ```
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

4. **Start processing documents**:
  The repository includes one document from each municipality (six in total).
  For example, to process the document from the Porto municipality, run:
   ```bash
   python -m src.main --municipality Porto --years 2023
   ```

   If you have additional data, you can specify multiple years or limit the number of documents to process:
   ```bash
   python -m src.main --years 2021 2022 --limit 5 --municipality Porto
   ```

### Project Structure

```
citilink/
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

## Known Issues

- Gemini API rate limits may affect the document processing.

## License

This project is licensed under the CC-BY-NC-ND-4.0 License - see the [LICENSE](LICENSE) file for details.

## Documentation and Resources
- **CitiLink Demo Online**: [https://demo.citilink.inesctec.pt/en](https://demo.citilink.inesctec.pt/en)
- **CitiLink Project**: [https://citilink.inesctec.pt/](https://citilink.inesctec.pt/)
- **Usability Evaluation Guide**: See `docs/platform_usability_evaluation_guide.docx` to see how the usability evaluation was conducted

## Credits and Acknowledgements
The platform was developed by [INESC TEC (Institute for Systems and Computer Engineering, Technology and Science)](https://www.inesctec.pt/pt).
<!-- specifically by the [NLP&IR](https://nlp.inesctec.pt) research group, part of the [LIAAD (Laboratory of Artificial Intelligence and Decision Support)](https://www.inesctec.pt/pt/centros/LIAAD) center. -->

### Affiliations
- [University of Beira Interior (UBI)](https://www.ubi.pt/)
- [University of Porto (UP)](https://www.up.pt/)
- [Portuguese Foundation for Science and Technology (FCT)](https://www.fct.pt/)
- [LabCom](https://www.labcom.ubi.pt/) 
- [Transdisciplinary Culture, Space and Memory Research Centre (CITCEM)](https://citcem.org/)
- [Ci2 Smart Cities Research Center](http://www.ci2.ipt.pt/pt/home/)

### Acknowledgements
- The municipalities of Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto for providing the meeting minutes publicly available and for their collaboration throughout the project.
- All team members and contributors who participated in the development, testing, and deployment of the CitiLink platform.

- This work was funded within the scope of the project  CitiLink, with reference [2024.07509.IACDC](https://doi.org/10.54499/2024.07509.IACDC), which is co-funded by Component 5 - Capitalization and Business Innovation, integrated in the Resilience Dimension of the Recovery and Resilience Plan within the scope of the Recovery and Resilience Mechanism (MRR) of the European Union (EU), framed in the Next Generation EU, for the period 2021 - 2026, measure RE-C05-i08.M04 - "To support the launch of a programme of R&D projects geared towards the development and implementation of advanced cybersecurity, artificial intelligence and data science systems in public administration, as well as a scientific training programme", as part of the funding contract signed between the Recovering Portugal Mission Structure (EMRP) and the FCT - Fundação para a Ciência e a Tecnologia, I.P. (Portuguese Foundation for Science and Technology), as intermediary beneficiary.

## Contact
For support, questions, or collaboration inquires: 
- **CitiLink Email**: citilink@inesctec.pt