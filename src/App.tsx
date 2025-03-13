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

  // Fetch recent cravings when component mounts
  useEffect(() => {
    fetchRecentCravings();
  }, []);

  const fetchRecentCravings = async () => {
    try {
      const { data, error } = await supabase
        .from('food_cravings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent cravings:', error);
        return;
      }

      if (data) {
        setRecentCravings(data);
      }
    } catch (error) {
      console.error('Error fetching recent cravings:', error);
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
      // Store the craving in Supabase
      const { data, error } = await supabase
        .from('food_cravings')
        .insert([{ text: inputValue }])
        .select();

      if (error) {
        console.error('Error storing food craving:', error);
        setIsLoading(false);
        return;
      }

      // For now, we'll just simulate a recommendation
      // In a real app, you might call an API or use more complex logic
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
        
        // Update the recommendation in the database
        if (data && data[0]) {
          supabase
            .from('food_cravings')
            .update({ recommendation: randomRecommendation })
            .eq('id', data[0].id)
            .then(() => {
              fetchRecentCravings();
            });
        }
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="input-container">
        <h1 className="heading">What are you craving?</h1>
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
        
        {recentCravings.length > 0 && (
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
