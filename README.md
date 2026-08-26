# UofT Quantum Computing Club Website

Official website for the University of Toronto Quantum Computing Club (UTQC).

**Live Website:** https://utqc-website.vercel.app  
**Repository:** https://github.com/utqc/utqc_website

---

## About the Project

The UTQC website was originally managed through WordPress. While this
provided a simple way to maintain the site, the available templates,
plugins, and customization options were limited by our WordPress plan
and UofT's restrictions.

To give the club more control over its design and functionality, we
transitioned to a custom-built website using HTML, CSS, and JavaScript.

The new website was designed to:

- Better represent UTQC's identity and activities
- Provide greater control over the site's UI/UX
- Make it easier to introduce custom features
- Improve responsiveness across different screen sizes
- Create a maintainable codebase for future WebDev teams
- Provide a better experience for current and prospective members

---

## Features

### Events

The events page includes an integration with Google Calendar to
dynamically display upcoming UTQC events.

Past events are displayed separately to highlight previous club
activities and events. THESE ARE STATIC.

### Projects

The projects page showcases UTQC's current and previous projects. As of the time of this readme file, there are no previous projects, so please move the current projects to previous once completed.

### Team

The team page introduces the UTQC executive team and organizes
members according to their respective divisions. Once a year ends, make a new page, and link the previous years' pages through buttons at the bottom of the page.

### Responsive Design

The website is designed to work across screens of different sizes.
Responsive layouts and CSS media queries are used to acclompish this. SO WHENEVER A NEW PAGE OR ELEMENT IS ADDED, make sure you adjust the CSS for a mobile phone too.

---

## Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Libraries / Services

- Font Awesome
- Google Fonts
- Google Calendar API

### Development & Deployment

- GitHub
- Vercel

---

## Project Structure

```text
utqc_website/
│
├── index.html
├── events.html
├── projects.html
├── team.html
│
├── styles.css: HERE YOU WILL FIND A LOT OF REUSABLE COMPONENTS, SEE FILE. 
│
├── assets/
│   ├── images/
│   ├── logos/
│   └── ...
│
└── README.md
