import React, { useState } from 'react';
import './App.css';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [submittedValue, setSubmittedValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittedValue(inputValue);
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
            placeholder="Enter text here..."
            className="centered-input"
          />
          <button type="submit" className="submit-button">Enter</button>
        </form>
        {submittedValue && (
          <div className="input-display">
            <p>You submitted: {submittedValue}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
