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

The events page includes an integration with Google Calendar to dynamically display upcoming UTQC events. It's connected to the quantum.uoft google calander, and the upcoming events add event cards automatically from the calendar (cards capped to 5).
Recurring events are displayed separately to highlight previous club activities and events. THEY ARE STATIC, so please add on if UTQC has any new recurring events..

### Projects

The projects page showcases UTQC's current and previous projects. As of the time of this readme file, there are no previous projects, so please move the current projects to previous once completed.

### Team

The team page introduces the UTQC executive team and organizes
members according to their respective divisions. Once a year ends, make a new page, and link the previous years' pages through buttons at the bottom of the page.

### Responsive Design

The website is designed to work across screens of different sizes.
Responsive layouts and CSS media queries are used to accomplish this. SO WHENEVER A NEW PAGE OR ELEMENT IS ADDED, make sure you adjust the CSS for a mobile phone too.

### Reusable components

The website uses several reusable components to keep the site design cohesive. Please see 'styles.css', and use appropriate elements, accordingly.

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

## Development Guidelines

- The website is primarily built with HTML, CSS, and JavaScript, so there is no complicated setup required.
- Keep the HTML structure semantic and organized.
- The website uses a consistent visual system across pages. Before creating a new style, check whether an existing class or component can be reused.
- Keep Typography (Quantico for accent text, Space Grotesk for all other), Spacing, and Colours consistent
- Keep Components reusable
- Keep Responsive behaviour in mind
- Work on branches to avoid breaking the live website
