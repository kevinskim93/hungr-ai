# Hungr-AI

Hungry? Get restaurant recommendations with AI-powered analysis of reviews!

## About

Hungr-AI helps you decide what to eat by analyzing restaurant reviews and matching your food cravings with the perfect restaurant. The app uses natural language processing to extract flavors, dishes, and sentiment from reviews, then ranks restaurants based on your input.

## Features

- **User Authentication**
  - Create an account with email, password, and name
  - Secure login/logout functionality
  - Personalized experience with user-specific data
  - Profile information display

- **Restaurant Recommendations**
  - AI-powered restaurant suggestions based on your food cravings
  - Natural language processing to extract flavors and dishes from reviews
  - Sentiment analysis to prioritize positive reviews
  - Ranking algorithm that considers ratings, review recency, and match to your query

- **Review Analysis**
  - Highlights matching terms in reviews that match your cravings
  - Extracts and displays key flavors mentioned in reviews
  - Identifies popular dishes from review content
  - Shows sentiment and relevance of each review

- **Personalization**
  - Save your favorite restaurants with one click
  - View and manage your saved restaurants
  - Track your food craving history
  - Filter recommendations based on your preferences

- **User Interface**
  - Clean, minimalist design with intuitive navigation
  - Home button for easy navigation from any screen
  - Responsive layout that works on desktop and mobile devices
  - Animated elements for a modern user experience
  - Typing animation for the app title

- **Integration**
  - Google Maps API integration for finding nearby restaurants
  - Supabase database for secure data storage
  - Row-Level Security (RLS) for data protection

## How It Works

### For Users Without Accounts

1. **Enter Your Craving**: Type what you're hungry for in the input field
2. **Get Recommendations**: The app searches nearby restaurants and analyzes their reviews
3. **View Results**: See restaurants with reviews matching your craving, complete with:
   - Restaurant details (name, address, rating)
   - Photos when available
   - Relevant reviews highlighting your search terms
   - Extracted flavors and dishes mentioned in reviews

### For Registered Users

1. **Create an Account**: Sign up with your email, password, and name
2. **Personalized Experience**: All your interactions are saved to your profile
3. **Save Favorites**: Click the heart icon to save restaurants you love
4. **Manage Favorites**: View and remove saved restaurants from your favorites list
5. **Track History**: See your recent food cravings and the recommendations you received
6. **Quick Access**: Use the home button to return to the main screen at any time

### Behind the Scenes

1. **Restaurant Search**: The app uses Google Maps Places API to find restaurants near your location
2. **Review Analysis**: Each review is processed to extract:
   - Flavors (sweet, spicy, savory, etc.)
   - Dishes (pizza, burger, pasta, etc.)
   - Sentiment (positive or negative)
3. **Matching Algorithm**: Reviews are matched against your query to find the most relevant restaurants
4. **Ranking System**: Restaurants are ranked based on:
   - Match between your query and extracted flavors/dishes
   - Overall rating and number of reviews
   - Sentiment of matching reviews
   - Recency of reviews
5. **Data Storage**: User data, cravings, and saved restaurants are securely stored in Supabase

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
3. In the SQL Editor, run the SQL commands from the `supabase_setup.sql` file to create the necessary tables and policies
4. If you encounter RLS (Row Level Security) issues during user registration, run the SQL commands in `QUICK_FIX.sql`

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

## Technologies Used

- React with TypeScript for the frontend
- CSS3 for styling and animations
- Supabase for authentication and database (PostgreSQL)
- Google Maps Places API for restaurant data
- Natural language processing (compromise.js) for text analysis
- Sentiment analysis for review evaluation
- Row-Level Security (RLS) for data protection

## Project Structure

- `src/App.tsx` - Main component with the core application logic
- `src/App.css` - Styling for the application
- `src/components/Auth.tsx` - Authentication component for user login/signup
- `src/styles/Auth.css` - Styling for the authentication component
- `src/services/googleMapsService.ts` - Service for Google Maps API integration
- `src/services/reviewAnalysisService.ts` - Service for analyzing restaurant reviews
- `src/supabaseClient.ts` - Supabase client configuration
- `public/index.html` - HTML template
- `supabase_setup.sql` - SQL commands for setting up the Supabase database
- `QUICK_FIX.sql` - SQL commands for fixing RLS issues
- `update_users_table.sql` - SQL commands for updating the users table structure

## Troubleshooting

### RLS Policy Issues

If you encounter errors related to Row-Level Security policies during user registration, follow these steps:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands in the `QUICK_FIX.sql` file
4. Try registering again

### API Key Issues

If restaurant recommendations aren't working:

1. Check that your Google Maps API key is correctly set in the `.env` file
2. Ensure that the Places API is enabled in your Google Cloud Console
3. Verify that your API key doesn't have overly restrictive usage limits

## Future Enhancements

- User preference settings for dietary restrictions
- Map view of recommended restaurants
- Integration with food delivery services
- Social sharing of favorite restaurants
- Advanced filtering options for restaurant types
- Mobile app version with native features
