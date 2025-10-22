![CitiLink Logo](./docs/assets/header.png)

# CitiLink - Enhancing Municipal Transparency and Citizen Engagement through Searchable Meeting Minutes

CitiLink is a platform that presents structured and searchable data extracted from municipal meeting minutes. It aims to demonstrate how Natural Language Processing (NLP) and Information Retrieval (IR) can make local government documentation more accessible and transparent. 

**What this project does**: In this demo, we focus on the exploration and visualization of meeting minutes from 6 Portuguese municipalities: Alandroal, Campo Maior, Covilhã, Fundão, Guimarães, and Porto.
The demonstration is available online at [https://demo.citilink.inesctec.pt/en](https://demo.citilink.inesctec.pt/en), but can also be run locally using Docker (instructions below).

**Who is it for**: This project is intended for local government officials, researchers, journalists, and citizens interested in enhancing transparency and engagement through improved access to municipal meeting records.

**The problem it solves**: Municipal meeting minutes are often lengthy, unstructured documents that are difficult to navigate and search upon. This project leverages NLP and IR techniques to extract key information, then presenting it in a user-friendly manner.


## Project Status

This project is currently in development.

## Technology Stack

- Languages: Python, JavaScript
- Frameworks: Flask, React, Tailwind CSS
- Database: MongoDB Atlas
- Other tools: Docker

## Dependencies
Listed on `data_extraction/requirements.txt` and `platform/backend/requirements.txt`


## Installation

### Platform - Docker Setup (Recommended)

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

## Usage

### Platform
- Web Interface: http://localhost
- API Documentation: http://localhost:5059/api/docs
   
### Data Extraction

See `data_extraction/README.md` for instructions on processing documents and populating the database.

<!-- 
## Project Structure

```
citilink/
├── data_extraction/          # LLM document processing
│   ├── src/
│   │   ├── processors/       # Document processors
│   │   ├── models/          # Database models
│   │   ├── prompts/         # AI prompts
│   │   └── utils/           # Utilities
│   ├── scripts/             # Management scripts
│   └── data/                # Input documents
│
└── platform/                # Web platform
    ├── backend/             # Flask API server
    ├── frontend/            # React.js application
    ├── nginx/               # Reverse proxy config
    ├── mongodb/              # Mongodb database config
    └── docker-compose.yml   # Docker setup
``` -->

## Architecture

![CitiLink Architecture](docs/diagrams/architecture.png)

## Known Issues

- Gemini API rate limits may affect the document processing.

## License

This project is licensed under the ??? License - see the [LICENSE](LICENSE) file for details.

## Documentation and Resources
- **CitiLink Demo Online**: [https://demo.citilink.inesctec.pt/en](https://demo.citilink.inesctec.pt/en)
- **CitiLink Project**: [https://citilink.inesctec.pt/](https://citilink.inesctec.pt/)
- **INESCTEC**: https://www.inesctec.pt
- **Database Models**: See `data_extraction/src/models/` for database schema
- **Usability Evaluation Guide**: See `docs/platform_usability_evaluation_guide.docx` to see how the usability evaluation was conducted

## Credits and Acknowledgements
This work was funded within the scope of the project  CitiLink, with reference [2024.07509.IACDC](https://doi.org/10.54499/2024.07509.IACDC), which is co-funded by Component 5 - Capitalization and Business Innovation, integrated in the Resilience Dimension of the Recovery and Resilience Plan within the scope of the Recovery and Resilience Mechanism (MRR) of the European Union (EU), framed in the Next Generation EU, for the period 2021 - 2026, measure RE-C05-i08.M04 - "To support the launch of a programme of R&D projects geared towards the development and implementation of advanced cybersecurity, artificial intelligence and data science systems in public administration, as well as a scientific training programme", as part of the funding contract signed between the Recovering Portugal Mission Structure (EMRP) and the FCT - Fundação para a Ciência e a Tecnologia, I.P. (Portuguese Foundation for Science and Technology), as intermediary beneficiary.

## Contact
For support, questions, or collaboration inquires: 
- **CitiLink Email**: citilink@inesctec.pt

---

