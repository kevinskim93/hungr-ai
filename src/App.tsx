import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { googleMapsService, Restaurant } from './services/googleMapsService';
import { reviewAnalysisService } from './services/reviewAnalysisService';

interface FoodCraving {
  id: number;
  created_at: string;
  text: string;
  recommendation?: string;
}

function App() {
  const [inputValue, setInputValue] = useState('');
  const [submittedValue, setSubmittedValue] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentCravings, setRecentCravings] = useState<FoodCraving[]>([]);
  const [dbConnected, setDbConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Check if Supabase is properly configured
  useEffect(() => {
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      
      console.log('Environment variables check:');
      console.log('- REACT_APP_SUPABASE_URL:', supabaseUrl ? 'Defined' : 'Not defined');
      console.log('- REACT_APP_SUPABASE_ANON_KEY:', supabaseKey ? 'Defined' : 'Not defined');
      console.log('- REACT_APP_GOOGLE_MAPS_API_KEY:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Defined' : 'Not defined');
      
      if (!supabaseUrl || supabaseUrl === 'your_supabase_url' || 
          !supabaseKey || supabaseKey === 'your_supabase_anon_key') {
        setDbConnected(false);
        console.warn('Supabase credentials not configured. Running in demo mode.');
      } else {
        // Test the connection
        testDatabaseConnection();
      }

      // Initialize Google Maps
      initializeGoogleMaps();
    } catch (err) {
      console.error('Error in configuration:', err);
      setError('Error in configuration. Check console for details.');
      setDbConnected(false);
    }
  }, []);

  const initializeGoogleMaps = async () => {
    try {
      const initialized = await googleMapsService.initialize();
      if (initialized) {
        setGoogleMapsReady(true);
        // Get user's location
        const location = await googleMapsService.getCurrentLocation();
        setUserLocation(location);
        console.log('Google Maps initialized successfully with location:', location);
      } else {
        console.warn('Google Maps could not be initialized. Some features will be limited.');
      }
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const { error } = await supabase.from('food_cravings').select('count').limit(1);
      if (error) {
        console.error('Database connection test failed:', error);
        setError(`Database connection error: ${error.message}`);
        setDbConnected(false);
      } else {
        console.log('Database connection successful');
      }
    } catch (err) {
      console.error('Error testing database connection:', err);
      setError('Error testing database connection. Check console for details.');
      setDbConnected(false);
    }
  };

  // Fetch recent cravings when component mounts
  useEffect(() => {
    if (dbConnected) {
      fetchRecentCravings();
    }
  }, [dbConnected]);

  const fetchRecentCravings = async () => {
    if (!dbConnected) return;
    
    try {
      const { data, error } = await supabase
        .from('food_cravings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent cravings:', error);
        setError(`Error fetching recent cravings: ${error.message}`);
        return;
      }

      if (data) {
        console.log('Fetched cravings:', data.length);
        setRecentCravings(data);
      }
    } catch (error) {
      console.error('Error fetching recent cravings:', error);
      setError('Error fetching recent cravings. Check console for details.');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    setSubmittedValue(inputValue);
    setRestaurants([]);
    setSelectedRestaurant(null);

    try {
      // If Google Maps is ready, search for restaurants
      if (googleMapsReady && userLocation) {
        await searchRestaurants(inputValue);
      } else {
        // Fallback to simple recommendations if Google Maps is not available
        generateSimpleRecommendation();
      }
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      setError('Error generating recommendation. Please try again.');
    }
  };

  const searchRestaurants = async (query: string) => {
    try {
      if (!userLocation) {
        throw new Error('User location not available');
      }

      // Search for restaurants based on the query
      const restaurantsData = await googleMapsService.searchNearbyRestaurants(
        query,
        userLocation
      );

      console.log(`Found ${restaurantsData.length} restaurants for query: ${query}`);

      if (restaurantsData.length === 0) {
        setRecommendation(`No restaurants found for "${query}". Try a different search term.`);
        setIsLoading(false);
        return;
      }

      // Analyze reviews for each restaurant
      const analyzedRestaurants = restaurantsData.map(restaurant => 
        reviewAnalysisService.analyzeRestaurantReviews(restaurant)
      );

      // Rank restaurants based on user input
      const rankedRestaurants = reviewAnalysisService.rankRestaurantsByUserInput(
        analyzedRestaurants,
        query
      );

      // Store the restaurants
      setRestaurants(rankedRestaurants);

      // Select the top restaurant
      const topRestaurant = rankedRestaurants[0];
      setSelectedRestaurant(topRestaurant);

      // Generate a recommendation based on the top restaurant
      const recommendationText = generateRestaurantRecommendation(topRestaurant, query);
      setRecommendation(recommendationText);

      // Store in database if connected
      if (dbConnected) {
        storeInDatabase(query, recommendationText);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error searching restaurants:', error);
      // Fallback to simple recommendation
      generateSimpleRecommendation();
    }
  };

  const generateRestaurantRecommendation = (restaurant: Restaurant, query: string): string => {
    // Extract positive flavors and dishes from reviews
    const positiveReviews = restaurant.reviews.filter(review => (review.sentimentScore || 0) > 0);
    
    const allFlavors = positiveReviews.flatMap(review => review.extractedFlavors || []);
    const allDishes = positiveReviews.flatMap(review => review.extractedDishes || []);
    
    // Get unique flavors and dishes
    const uniqueFlavors = Array.from(new Set(allFlavors)).slice(0, 3);
    const uniqueDishes = Array.from(new Set(allDishes)).slice(0, 3);
    
    // Build recommendation text
    let recommendationText = `Try ${restaurant.name}!`;
    
    if (restaurant.rating) {
      recommendationText += ` It has a ${restaurant.rating.toFixed(1)}/5 rating`;
      if (restaurant.userRatingsTotal) {
        recommendationText += ` from ${restaurant.userRatingsTotal} reviews`;
      }
      recommendationText += '.';
    }
    
    if (uniqueFlavors.length > 0) {
      recommendationText += ` Reviewers describe the food as ${uniqueFlavors.join(', ')}.`;
    }
    
    if (uniqueDishes.length > 0) {
      recommendationText += ` Popular dishes include ${uniqueDishes.join(', ')}.`;
    }
    
    return recommendationText;
  };

  const generateSimpleRecommendation = () => {
    // Fallback to simple recommendations if Google Maps is not available
    setTimeout(() => {
      const recommendations = [
        'Try a local Italian restaurant!',
        'How about some sushi?',
        'A burger joint might satisfy that craving!',
        'Maybe some tacos would hit the spot?',
        'Thai food could be perfect for that!',
        'Pizza is always a good choice!',
        'Have you considered Indian cuisine?'
      ];
      
      const randomRecommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
      setRecommendation(randomRecommendation);
      setIsLoading(false);
      
      // Store in database if connected
      if (dbConnected) {
        storeInDatabase(inputValue, randomRecommendation);
      }
    }, 1500);
  };

  const storeInDatabase = async (text: string, recommendation: string) => {
    try {
      console.log('Storing in database:', { text, recommendation });
      // Store the craving in Supabase
      const { data, error } = await supabase
        .from('food_cravings')
        .insert([{ text, recommendation }])
        .select();

      if (error) {
        console.error('Error storing food craving:', error);
        setError(`Error storing food craving: ${error.message}`);
        return;
      }

      console.log('Successfully stored craving:', data);
      fetchRecentCravings();
    } catch (error) {
      console.error('Error storing in database:', error);
      setError('Error storing in database. Check console for details.');
    }
  };

  // If there's a critical error, show a fallback UI
  if (error) {
    return (
      <div className="App">
        <div className="input-container">
          <h1 className="heading">Hungr-AI</h1>
          <div className="error-message">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <p>Please check the console for more details.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="input-container">
        <h1 className="heading">What are you craving?</h1>
        {!dbConnected && (
          <div className="db-warning">
            <p>Running in demo mode. Database not connected.</p>
            <p>Check README.md for setup instructions.</p>
          </div>
        )}
        {!googleMapsReady && (
          <div className="api-warning">
            <p>Google Maps API not configured. Advanced restaurant recommendations are disabled.</p>
            <p>Add your Google Maps API key to the .env file.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter food craving here..."
            className="centered-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? 'Thinking...' : 'Enter'}
          </button>
        </form>
        
        {isLoading && (
          <div className="loading-message">
            <p>Finding the perfect recommendation for you...</p>
          </div>
        )}
        
        {!isLoading && submittedValue && recommendation && (
          <div className="recommendation-display">
            <p>Based on your craving for <strong>{submittedValue}</strong>:</p>
            <h2>{recommendation}</h2>
            
            {selectedRestaurant && (
              <div className="restaurant-details">
                <div className="restaurant-info">
                  <p className="restaurant-address">{selectedRestaurant.vicinity}</p>
                  <div className="restaurant-rating">
                    <span className="stars">{'★'.repeat(Math.round(selectedRestaurant.rating))}</span>
                    <span className="rating-count">({selectedRestaurant.userRatingsTotal} reviews)</span>
                  </div>
                </div>
                
                {selectedRestaurant.photos && selectedRestaurant.photos.length > 0 && (
                  <div className="restaurant-photo">
                    <img src={selectedRestaurant.photos[0]} alt={selectedRestaurant.name} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {restaurants.length > 1 && (
          <div className="other-restaurants">
            <h3>Other restaurants you might like:</h3>
            <ul className="restaurant-list">
              {restaurants.slice(1, 4).map(restaurant => (
                <li key={restaurant.id} className="restaurant-item">
                  <div className="restaurant-name">{restaurant.name}</div>
                  <div className="restaurant-rating">
                    <span className="stars">{'★'.repeat(Math.round(restaurant.rating))}</span>
                    <span className="rating-count">({restaurant.userRatingsTotal})</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {dbConnected && recentCravings.length > 0 && (
          <div className="recent-cravings">
            <h3>Recent Cravings</h3>
            <ul>
              {recentCravings.map((craving) => (
                <li key={craving.id}>
                  <span className="craving-text">{craving.text}</span>
                  {craving.recommendation && (
                    <span className="craving-recommendation">→ {craving.recommendation}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
