import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

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

  // Check if Supabase is properly configured
  useEffect(() => {
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      
      console.log('Environment variables check:');
      console.log('- REACT_APP_SUPABASE_URL:', supabaseUrl ? 'Defined' : 'Not defined');
      console.log('- REACT_APP_SUPABASE_ANON_KEY:', supabaseKey ? 'Defined' : 'Not defined');
      
      if (!supabaseUrl || supabaseUrl === 'your_supabase_url' || 
          !supabaseKey || supabaseKey === 'your_supabase_anon_key') {
        setDbConnected(false);
        console.warn('Supabase credentials not configured. Running in demo mode.');
      } else {
        // Test the connection
        testDatabaseConnection();
      }
    } catch (err) {
      console.error('Error in Supabase configuration:', err);
      setError('Error in Supabase configuration. Check console for details.');
      setDbConnected(false);
    }
  }, []);

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

    try {
      // Generate a recommendation
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
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      setError('Error generating recommendation. Please try again.');
    }
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
