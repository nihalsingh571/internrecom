# InternConnect - Intelligent Internship Recommendation System

InternConnect is a comprehensive platform designed to bridge the gap between students and recruiters. It leverages machine learning to provide personalized internship recommendations based on candidate skills, assessment performance, and verification scores (VSPS).

## 📸 Screenshots

| Dashboard | Upload an Internship |
|-----------|-------------|
| ![Dashboard](<src/snap/internrecom - Google Chrome 03-02-2026 00_37_52.png>) | ![Upload an Internship](<src/snap/internrecom - Google Chrome 03-02-2026 00_38_10.png>) |

| Verify Your Skills Before Adding | Recommendations |
|------------------|-----------------|
| ![Verify Your Skills Before Adding](<src/snap/internrecom - Google Chrome 03-02-2026 00_38_23.png>) | ![Recomendation](<src/snap/internrecom - Google Chrome 03-02-2026 00_39_16.png>) |

| Assessment | Proctored Assessment |
|------------|---------|
| ![Assessment](<src/snap/internrecom - Google Chrome 03-02-2026 00_38_38.png>) | ![Proctored Assessment](<src/snap/internrecom - Google Chrome 03-02-2026 00_38_48.png>) |

## 🚀 Features

-   **AI-Powered Recommendations**: Uses a custom Recommendation Engine (Cosine Similarity + VSPS Score) to match students with the best internships.
-   **Verification System (VSPS)**: Verified Student Performance Score ensures recruiters see candidates verified for their skills.
-   **Recruiter Dashboard**: Post internships, manage applications, and view candidates ranked by their VSPS score.
-   **Student Portal**: Take skill assessments, view recommended internships, and apply with one click.
-   **Real-time Notifications**: Instant updates on application status (Planned).

## 🛠️ Technology Stack

-   **Frontend**: React.js (Vite), Tailwind CSS, Framer Motion
-   **Backend**: Django REST Framework (Python)
-   **Database**: SQLite (Dev) / PostgreSQL (Prod)
-   **ML Engine**: Scikit-Learn, NumPy, Pandas

## ☁️ DevOps & Infrastructure

This project implements a robust DevOps pipeline ensuring scalability, reliability, and automated deployment.

### Infrastructure as Code (IaC) - **Terraform**
-   Provisioned AWS infrastructure including VPCs, EC2 instances, and Security Groups.
-   Automated simple and reproducible environment setup.

### Configuration Management - **Ansible**
-   Automated the configuration of EC2 instances.
-   Managed dependencies, installed Docker, and set up environment variables across servers.

### Containerization - **Docker**
-   Both Frontend and Backend are dockerized for consistency across development and production environments.
-   `docker-compose` used for orchestrating multi-container services.

### Cloud Provider - **AWS**
-   Hosted on Amazon Web Services (AWS) using EC2 for compute and S3 for static asset storage.
-   Scalable architecture designed to handle varying loads.

### Monitoring - **Nagios**
-   Real-time monitoring of server health, disk usage, and uptime.
-   Alerting system configured to notify administrators of any downtime or performance anomalies.

## 🏁 Getting Started

### Prerequisites
-   Node.js & npm
-   Python 3.8+
-   Docker (Optional)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/nihalsingh571/internrecom.git
    cd internrecom
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver
    ```

3.  **Frontend Setup**
    ```bash
    cd src
    npm install
    npm run dev
    ```

---
*Built with ❤️ by Nihal Singh*