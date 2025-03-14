import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { googleMapsService, Restaurant, Review } from './services/googleMapsService';
import { reviewAnalysisService } from './services/reviewAnalysisService';
import Auth from './components/Auth';
import { v4 as uuidv4 } from 'uuid';

interface FoodCraving {
  id: number | string;
  created_at: string;
  text: string;
  recommendation?: string;
}

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AnonymousProfile {
  id: string;
  cravings: FoodCraving[];
  lastVisit: string;
}

// Maximum number of cravings to store for anonymous users
const MAX_ANONYMOUS_CRAVINGS = 5;

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
  const [matchingReviews, setMatchingReviews] = useState<Map<string, Review[]>>(new Map());
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [savedRestaurants, setSavedRestaurants] = useState<any[]>([]);
  const [savedRestaurantIds, setSavedRestaurantIds] = useState<Set<string>>(new Set());
  const [anonymousId, setAnonymousId] = useState<string>('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle home button click
  const handleHomeClick = () => {
    setShowAuth(false);
    setError(null);
    window.location.reload();
  };

  // Initialize or retrieve anonymous user profile
  useEffect(() => {
    if (!user) {
      initializeAnonymousProfile();
    }
  }, [user]);

  const initializeAnonymousProfile = () => {
    try {
      // Try to get existing anonymous profile from localStorage
      const storedProfile = localStorage.getItem('hungr_anonymous_profile');
      
      if (storedProfile) {
        const profile: AnonymousProfile = JSON.parse(storedProfile);
        setAnonymousId(profile.id);
        
        // Only set recent cravings if we don't have a logged-in user
        if (!user && profile.cravings && profile.cravings.length > 0) {
          setRecentCravings(profile.cravings);
        }
        
        // Update last visit timestamp
        profile.lastVisit = new Date().toISOString();
        localStorage.setItem('hungr_anonymous_profile', JSON.stringify(profile));
        
        console.log('Retrieved anonymous profile:', profile.id);
      } else {
        // Create new anonymous profile
        const newId = uuidv4();
        setAnonymousId(newId);
        
        const newProfile: AnonymousProfile = {
          id: newId,
          cravings: [],
          lastVisit: new Date().toISOString()
        };
        
        localStorage.setItem('hungr_anonymous_profile', JSON.stringify(newProfile));
        console.log('Created new anonymous profile:', newId);
      }
    } catch (error) {
      console.error('Error managing anonymous profile:', error);
      // If there's an error, create a new ID but don't try to store it
      setAnonymousId(uuidv4());
    }
  };

  // Save craving to anonymous profile in localStorage
  const saveAnonymousCraving = (craving: FoodCraving) => {
    try {
      const storedProfile = localStorage.getItem('hungr_anonymous_profile');
      
      if (storedProfile) {
        const profile: AnonymousProfile = JSON.parse(storedProfile);
        
        // Add new craving at the beginning
        profile.cravings = [craving, ...profile.cravings];
        
        // Limit to MAX_ANONYMOUS_CRAVINGS
        if (profile.cravings.length > MAX_ANONYMOUS_CRAVINGS) {
          profile.cravings = profile.cravings.slice(0, MAX_ANONYMOUS_CRAVINGS);
        }
        
        localStorage.setItem('hungr_anonymous_profile', JSON.stringify(profile));
        
        // Update state
        setRecentCravings(profile.cravings);
        console.log('Saved craving to anonymous profile');
      }
    } catch (error) {
      console.error('Error saving anonymous craving:', error);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data && data.session?.user) {
        setUser(data.session.user as User);
      }
    };
    
    checkUser();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user as User);
          setShowAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Re-initialize anonymous profile when user logs out
          initializeAnonymousProfile();
        }
      }
    );
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

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

  // Fetch recent cravings when component mounts or user changes
  useEffect(() => {
    if (dbConnected && user) {
      fetchRecentCravings();
    }
  }, [dbConnected, user]);

  const fetchRecentCravings = async () => {
    if (!dbConnected || !user) return;
    
    try {
      let query = supabase
        .from('food_cravings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // If user is logged in, filter by user_id
      if (user) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

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

  // Fetch saved restaurants when user changes
  useEffect(() => {
    if (user && dbConnected) {
      fetchSavedRestaurants();
    } else {
      setSavedRestaurants([]);
    }
  }, [user, dbConnected]);
  
  const fetchSavedRestaurants = async () => {
    if (!user || !dbConnected) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_restaurants')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        console.log('Fetched saved restaurants:', data.length);
        setSavedRestaurants(data);
        
        // Update the set of saved restaurant IDs
        const ids = new Set(data.map(item => item.restaurant_id));
        setSavedRestaurantIds(ids);
      }
    } catch (error) {
      console.error('Error fetching saved restaurants:', error);
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
    setMatchingReviews(new Map());

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

      // Find reviews that match the user's input
      const reviewMatches = new Map<string, Review[]>();
      const queryTerms = query.toLowerCase().split(' ');
      
      analyzedRestaurants.forEach(restaurant => {
        const matchingReviews = restaurant.reviews.filter(review => {
          // Check if review text contains any of the query terms
          const reviewText = review.text.toLowerCase();
          return queryTerms.some(term => 
            term.length > 3 && reviewText.includes(term)
          ) || 
          // Or if extracted flavors/dishes match query terms
          (review.extractedFlavors?.some(flavor => 
            queryTerms.includes(flavor.toLowerCase())
          )) ||
          (review.extractedDishes?.some(dish => 
            queryTerms.some(term => dish.toLowerCase().includes(term))
          ));
        });
        
        // Sort matching reviews by recency
        const sortedReviews = matchingReviews.sort((a, b) => b.time - a.time);
        
        // Store up to 3 most recent matching reviews
        if (sortedReviews.length > 0) {
          reviewMatches.set(restaurant.id, sortedReviews.slice(0, 3));
        }
      });
      
      setMatchingReviews(reviewMatches);

      // Rank restaurants based on user input and matching reviews
      const rankedRestaurants = reviewAnalysisService.rankRestaurantsByUserInput(
        analyzedRestaurants,
        query
      );

      // Filter to only include restaurants with matching reviews
      const restaurantsWithMatchingReviews = rankedRestaurants.filter(
        restaurant => reviewMatches.has(restaurant.id)
      );
      
      // If no restaurants have matching reviews, show all ranked restaurants
      const restaurantsToShow = restaurantsWithMatchingReviews.length > 0 
        ? restaurantsWithMatchingReviews 
        : rankedRestaurants;

      // Store the restaurants
      setRestaurants(restaurantsToShow);

      // Select the top restaurant
      const topRestaurant = restaurantsToShow[0];
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
      
      if (user && dbConnected) {
        // Store the craving in Supabase for logged-in users
        const { data, error } = await supabase
          .from('food_cravings')
          .insert([{ 
            text, 
            recommendation,
            user_id: user.id
          }])
          .select();

        if (error) {
          console.error('Error storing food craving:', error);
          setError(`Error storing food craving: ${error.message}`);
          return;
        }

        console.log('Successfully stored craving:', data);
        fetchRecentCravings();
      } else {
        // Store in localStorage for anonymous users
        const newCraving: FoodCraving = {
          id: uuidv4(),
          created_at: new Date().toISOString(),
          text,
          recommendation
        };
        
        saveAnonymousCraving(newCraving);
      }
    } catch (error) {
      console.error('Error storing in database:', error);
      setError('Error storing in database. Check console for details.');
    }
  };

  // Helper function to highlight matching terms in review text
  const highlightMatchingTerms = (text: string, query: string): React.ReactNode => {
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 3);
    
    if (queryTerms.length === 0) {
      return <span>{text}</span>;
    }
    
    const parts = [];
    let lastIndex = 0;
    
    // Simple regex to find all matches
    const regex = new RegExp(`(${queryTerms.join('|')})`, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
      }
      
      // Add highlighted match
      parts.push(
        <span key={`highlight-${match.index}`} className="highlight-match">
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }
    
    return <>{parts}</>;
  };

  const handleLogin = (user: User) => {
    setUser(user);
    setShowAuth(false);
    
    // Refresh data for the logged-in user
    if (dbConnected) {
      fetchRecentCravings();
      fetchSavedRestaurants();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const toggleAuthModal = () => {
    setShowAuth(!showAuth);
  };

  const saveRestaurant = async (restaurant: Restaurant) => {
    if (!user) {
      // Prompt user to log in
      setShowAuth(true);
      return;
    }
    
    try {
      // Check if restaurant is already saved
      const { data: existingData, error: checkError } = await supabase
        .from('saved_restaurants')
        .select('id')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        throw checkError;
      }
      
      if (existingData) {
        // Restaurant already saved, remove it
        const { error: deleteError } = await supabase
          .from('saved_restaurants')
          .delete()
          .eq('id', existingData.id);
          
        if (deleteError) throw deleteError;
        
        // Show success message
        alert(`Removed ${restaurant.name} from favorites`);
      } else {
        // Save the restaurant
        const { error: insertError } = await supabase
          .from('saved_restaurants')
          .insert([{
            user_id: user.id,
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            restaurant_data: restaurant
          }]);
          
        if (insertError) throw insertError;
        
        // Show success message
        alert(`Saved ${restaurant.name} to favorites`);
      }
      
      // Refresh the saved restaurants list
      fetchSavedRestaurants();
    } catch (error: any) {
      console.error('Error saving restaurant:', error);
      alert(`Error: ${error.message || 'Could not save restaurant'}`);
    }
  };

  // Check if a restaurant is saved as favorite
  const isRestaurantSaved = async (restaurantId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('saved_restaurants')
        .select('id')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .single();
        
      return !!data; // Return true if data exists
    } catch (error) {
      return false;
    }
  };

  // Check scroll position to show/hide button
  useEffect(() => {
    const checkScrollTop = () => {
      if (!showScrollTop && window.pageYOffset > 400) {
        setShowScrollTop(true);
      } else if (showScrollTop && window.pageYOffset <= 400) {
        setShowScrollTop(false);
      }
    };
    
    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, [showScrollTop]);
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // If there's a critical error, show a fallback UI
  if (error) {
    return (
      <div className="App">
        <button className="home-button" onClick={handleHomeClick}>
          <span className="home-icon">🏠</span> Home
        </button>
        <div className="input-container">
          <div className="title-container">
            <h1 className="heading">
              <span className="typing-text"></span>
            </h1>
          </div>
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
      <button className="home-button" onClick={handleHomeClick}>
        <span className="home-icon">🏠</span> Home
      </button>
      <div className="input-container">
        {showAuth ? (
          <Auth onLogin={handleLogin} onHomeClick={handleHomeClick} />
        ) : (
          <>
            <div className="user-section">
              {user ? (
                <div className="user-info">
                  <span className="user-name">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <button onClick={handleLogout} className="logout-button">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="user-info">
                  {anonymousId && (
                    <span className="anonymous-user">Guest User</span>
                  )}
                  <button onClick={toggleAuthModal} className="login-button">
                    Login / Sign Up
                  </button>
                </div>
              )}
            </div>
            
            <div className="title-container">
              <h1 className="heading">
                <span className="typing-text"></span>
              </h1>
              <p className="subtitle">What are you craving today?</p>
            </div>
            
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
            
            <form onSubmit={handleSubmit} className={`input-form ${inputValue.trim() ? 'has-input' : ''}`}>
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter food craving here..."
                className="centered-input"
                disabled={isLoading}
              />
              {inputValue.trim() && (
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isLoading}
                  aria-label="Submit"
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <span className="arrow-up"></span>
                  )}
                </button>
              )}
            </form>
            
            {isLoading && (
              <div className="loading-message">
                <p>Finding restaurants with reviews matching "{inputValue}"...</p>
              </div>
            )}
            
            {!isLoading && submittedValue && restaurants.length > 0 && (
              <div className="restaurants-container">
                <h2 className="results-heading">Restaurants with "{submittedValue}" in reviews:</h2>
                
                {restaurants.map((restaurant, index) => (
                  <div key={restaurant.id} className={`restaurant-card ${index === 0 ? 'featured-restaurant' : ''}`}>
                    <div className="restaurant-header">
                      <h3 className="restaurant-title">{restaurant.name}</h3>
                      <div className="restaurant-rating">
                        <span className="stars">{'★'.repeat(Math.round(restaurant.rating))}</span>
                        <span className="rating-count">({restaurant.userRatingsTotal} reviews)</span>
                      </div>
                    </div>
                    
                    {user && (
                      <button 
                        onClick={() => saveRestaurant(restaurant)} 
                        className={`save-restaurant-button ${savedRestaurantIds.has(restaurant.id) ? 'saved' : ''}`}
                        title={savedRestaurantIds.has(restaurant.id) 
                          ? `Remove ${restaurant.name} from favorites` 
                          : `Save ${restaurant.name} to favorites`}
                      >
                        ♥
                      </button>
                    )}
                    
                    <p className="restaurant-address">{restaurant.vicinity}</p>
                    
                    {restaurant.photos && restaurant.photos.length > 0 && (
                      <div className="restaurant-photo">
                        <img src={restaurant.photos[0]} alt={restaurant.name} />
                      </div>
                    )}
                    
                    {matchingReviews.has(restaurant.id) && (
                      <div className="matching-reviews">
                        <h4>Reviews mentioning "{submittedValue}":</h4>
                        <div className="reviews-list">
                          {matchingReviews.get(restaurant.id)?.map((review, reviewIndex) => (
                            <div key={`${restaurant.id}-review-${reviewIndex}`} className="review-item">
                              <div className="review-header">
                                <span className="review-author">{review.authorName}</span>
                                <span className="review-rating">
                                  {'★'.repeat(Math.round(review.rating))}
                                </span>
                                <span className="review-time">{review.relativeTimeDescription}</span>
                              </div>
                              <p className="review-text">
                                {highlightMatchingTerms(review.text, submittedValue)}
                              </p>
                              {review.extractedFlavors && review.extractedFlavors.length > 0 && (
                                <div className="review-flavors">
                                  <span className="flavor-label">Flavors: </span>
                                  {review.extractedFlavors.map((flavor, i) => (
                                    <span key={`flavor-${i}`} className="flavor-tag">
                                      {flavor}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {review.extractedDishes && review.extractedDishes.length > 0 && (
                                <div className="review-dishes">
                                  <span className="dish-label">Dishes: </span>
                                  {review.extractedDishes.map((dish, i) => (
                                    <span key={`dish-${i}`} className="dish-tag">
                                      {dish}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && submittedValue && restaurants.length === 0 && recommendation && (
              <div className="recommendation-display">
                <p>Based on your craving for <strong>{submittedValue}</strong>:</p>
                <h2>{recommendation}</h2>
              </div>
            )}
            
            {user && dbConnected && savedRestaurants.length > 0 && (
              <div className="saved-restaurants">
                <h3>Your Favorite Restaurants</h3>
                <div className="saved-restaurants-list">
                  {savedRestaurants.map((saved) => {
                    const restaurant = saved.restaurant_data;
                    return (
                      <div key={saved.id} className="saved-restaurant-item">
                        <div className="saved-restaurant-header">
                          <h4 className="saved-restaurant-name">{restaurant.name}</h4>
                          <button 
                            onClick={() => saveRestaurant(restaurant)} 
                            className="remove-saved-button"
                            title="Remove from favorites"
                          >
                            ×
                          </button>
                        </div>
                        <p className="saved-restaurant-address">{restaurant.vicinity}</p>
                        {restaurant.rating && (
                          <div className="saved-restaurant-rating">
                            <span className="stars">{'★'.repeat(Math.round(restaurant.rating))}</span>
                            <span className="rating-count">({restaurant.userRatingsTotal} reviews)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {!user && recentCravings.length > 0 && (
              <div className="recent-cravings">
                <h3>Your Recent Searches</h3>
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
                <p className="anonymous-note">Sign up to save your history permanently!</p>
              </div>
            )}
            
            {user && dbConnected && recentCravings.length > 0 && (
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
            
            {/* Scroll to top button */}
            <div 
              className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`} 
              onClick={scrollToTop}
            >
              ↑
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
