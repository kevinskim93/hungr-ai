# Hungr-AI

Hungry? Get restaurant recommendations with AI-powered analysis of reviews!

## About

Hungr-AI helps you decide what to eat by analyzing restaurant reviews and matching your food cravings with the perfect restaurant. The app uses natural language processing to extract flavors, dishes, and sentiment from reviews, then ranks restaurants based on your input.

## Features

- Clean, minimalist design
- Centered text input field for entering your food cravings
- AI-powered restaurant recommendations based on review analysis
- Google Maps API integration for finding nearby restaurants
- Natural language processing to extract flavors and dishes from reviews
- Sentiment analysis to prioritize positive reviews
- Ranking algorithm that considers ratings, review recency, and match to your query
- Supabase database integration for storing cravings and recommendations
- History of recent food cravings

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Supabase account (free tier)
- Google Maps API key (with Places API enabled)

### API Setup

#### Supabase Setup

1. Create a free account at [Supabase](https://supabase.com/)
2. Create a new project and note your project URL and anon key
3. In the SQL Editor, run the SQL commands from the `supabase_setup.sql` file to create the necessary table and policies

#### Google Maps API Setup

1. Create a Google Cloud Platform account if you don't have one
2. Create a new project in the Google Cloud Console
3. Enable the Places API and Maps JavaScript API
4. Create an API key with appropriate restrictions
5. For more details, see the [Google Maps Platform documentation](https://developers.google.com/maps/documentation/javascript/get-api-key)

### Environment Variables

Create a `.env` file in the project root with the following content:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```
Replace the placeholder values with your actual API keys.

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

## How It Works

1. **User Input**: Enter what you're craving in the input field
2. **Restaurant Search**: The app searches for nearby restaurants using Google Maps Places API
3. **Review Analysis**: Reviews are analyzed using natural language processing to extract:
   - Flavors (sweet, spicy, savory, etc.)
   - Dishes (pizza, burger, pasta, etc.)
   - Sentiment (positive or negative)
4. **Restaurant Ranking**: Restaurants are ranked based on:
   - Match between your query and extracted flavors/dishes
   - Overall rating
   - Sentiment of reviews
   - Recency of reviews
5. **Recommendation**: The top-ranked restaurant is recommended with details about what makes it a good match

## Technologies Used

- React
- TypeScript
- CSS3
- Supabase (PostgreSQL database)
- Google Maps Places API
- Natural language processing (compromise.js)
- Sentiment analysis

## Project Structure

- `src/App.tsx` - Main component with the input field and recommendation logic
- `src/App.css` - Styling for the application
- `src/services/googleMapsService.ts` - Service for Google Maps API integration
- `src/services/reviewAnalysisService.ts` - Service for analyzing restaurant reviews
- `src/supabaseClient.ts` - Supabase client configuration
- `public/index.html` - HTML template
- `supabase_setup.sql` - SQL commands for setting up the Supabase database
