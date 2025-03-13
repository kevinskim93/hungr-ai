# Hungr-AI

Hungry? Get recommendations with this simple text input web application!

## About

This app helps you decide what to eat by providing a simple interface to enter your food cravings.

## Features

- Clean, minimalist design
- Centered text input field for entering your food cravings
- Real-time display of entered text
- Responsive layout
- Supabase database integration for storing cravings and recommendations
- History of recent food cravings

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Supabase account (free tier)

### Supabase Setup

1. Create a free account at [Supabase](https://supabase.com/)
2. Create a new project and note your project URL and anon key
3. In the SQL Editor, run the SQL commands from the `supabase_setup.sql` file to create the necessary table and policies
4. Create a `.env` file in the project root with the following content:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase project URL and anon key.

### Installation

1. Clone this repository or navigate to the project directory:

```bash
git clone https://github.com/kevinskim93/hungr-ai.git
cd hungr-ai
```

2. Install dependencies:

```bash
npm install
```

### Running the App

To start the development server:

```bash
npm start
```

This will run the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Building for Production

To build the app for production:

```bash
npm run build
```

This builds the app for production to the `build` folder, optimizing the build for the best performance.

## Technologies Used

- React
- TypeScript
- CSS3
- Supabase (PostgreSQL database)

## Project Structure

- `src/App.tsx` - Main component with the input field and recommendation logic
- `src/App.css` - Styling for the application
- `src/supabaseClient.ts` - Supabase client configuration
- `public/index.html` - HTML template
- `supabase_setup.sql` - SQL commands for setting up the Supabase database
