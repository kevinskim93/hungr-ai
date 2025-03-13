import nlp from 'compromise';
import sentiment from 'sentiment';
import { Restaurant, Review } from './googleMapsService';

// Common food-related terms to help with extraction
const COMMON_FLAVORS = [
  'sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'hot', 'mild',
  'savory', 'tangy', 'rich', 'creamy', 'smoky', 'fruity', 'nutty', 'buttery',
  'crispy', 'crunchy', 'tender', 'juicy', 'moist', 'dry', 'flaky', 'chewy',
  'garlicky', 'herby', 'citrusy', 'zesty', 'refreshing', 'hearty', 'light',
  'fresh', 'aromatic', 'pungent', 'fiery', 'mild', 'bold', 'delicate'
];

// Common dish types
const COMMON_DISHES = [
  'pizza', 'burger', 'pasta', 'salad', 'sandwich', 'taco', 'burrito', 'sushi',
  'ramen', 'curry', 'steak', 'chicken', 'fish', 'seafood', 'soup', 'noodle',
  'rice', 'bread', 'dessert', 'cake', 'ice cream', 'appetizer', 'main course',
  'breakfast', 'lunch', 'dinner', 'brunch', 'snack', 'side dish', 'entree',
  'appetizer', 'starter', 'main', 'dessert'
];

class ReviewAnalysisService {
  private sentimentAnalyzer: any;
  
  constructor() {
    this.sentimentAnalyzer = new sentiment();
    
    // Extend compromise with food-related terms
    // @ts-ignore - Ignoring type issues with compromise plugin API
    nlp.extend((Doc: any, world: any) => {
      world.addWords({
        'flavor': 'Noun',
        'dish': 'Noun',
        // Add common flavors and dishes as nouns
        ...COMMON_FLAVORS.reduce((acc, flavor) => ({ ...acc, [flavor]: 'Adjective' }), {}),
        ...COMMON_DISHES.reduce((acc, dish) => ({ ...acc, [dish]: 'Noun' }), {})
      });
    });
  }

  /**
   * Analyze a single review to extract flavors, dishes, and sentiment
   */
  analyzeReview(review: Review): Review {
    const analyzedReview = { ...review };
    
    // Skip if no text
    if (!review.text) {
      return analyzedReview;
    }
    
    // Analyze sentiment
    const sentimentResult = this.sentimentAnalyzer.analyze(review.text);
    analyzedReview.sentimentScore = sentimentResult.comparative;
    
    // Extract flavors and dishes using NLP
    const doc = nlp(review.text);
    
    // Extract flavors (adjectives that might describe food)
    const flavorMatches = doc.match('(sweet|sour|salty|bitter|spicy|hot|mild|savory|tangy|rich|creamy|smoky|fruity|nutty|buttery|crispy|crunchy|tender|juicy|moist|dry|flaky|chewy|garlicky|herby|citrusy|zesty|refreshing|hearty|light|fresh|aromatic|pungent|fiery|mild|bold|delicate)');
    analyzedReview.extractedFlavors = flavorMatches.out('array');
    
    // Extract dishes (nouns that might be food items)
    // First, look for specific dishes we know
    const knownDishMatches = doc.match(COMMON_DISHES.join('|'));
    
    // Then look for noun phrases that might be dishes
    const foodContext = doc.match('(ate|ordered|tried|had|enjoyed|loved|liked|recommend) [.+]');
    const potentialDishes = foodContext.match('#Noun+');
    
    // Combine and deduplicate
    const allDishes = [...knownDishMatches.out('array'), ...potentialDishes.out('array')];
    analyzedReview.extractedDishes = Array.from(new Set(allDishes));
    
    return analyzedReview;
  }

  /**
   * Analyze all reviews for a restaurant
   */
  analyzeRestaurantReviews(restaurant: Restaurant): Restaurant {
    const analyzedRestaurant = { ...restaurant };
    
    // Analyze each review
    analyzedRestaurant.reviews = restaurant.reviews.map(review => 
      this.analyzeReview(review)
    );
    
    return analyzedRestaurant;
  }

  /**
   * Analyze and rank restaurants based on user input
   */
  rankRestaurantsByUserInput(
    restaurants: Restaurant[],
    userInput: string,
    options = { recentReviewsWeight: 0.3, sentimentWeight: 0.3, ratingWeight: 0.2, matchWeight: 0.2 }
  ): Restaurant[] {
    // Parse user input to extract key terms
    const userDoc = nlp(userInput);
    const userFlavors = userDoc.match(COMMON_FLAVORS.join('|')).out('array');
    const userDishes = userDoc.match(COMMON_DISHES.join('|')).out('array');
    
    // If no specific terms found, use the whole input for matching
    const searchTerms = [...userFlavors, ...userDishes].length > 0 
      ? [...userFlavors, ...userDishes] 
      : userInput.split(' ').filter(term => term.length > 3);
    
    // Calculate a match score for each restaurant
    const rankedRestaurants = restaurants.map(restaurant => {
      const restaurantCopy = { ...restaurant };
      let matchScore = 0;
      
      // Base score from restaurant rating
      const ratingScore = restaurant.rating / 5 * options.ratingWeight;
      
      // Score from review recency and sentiment
      let reviewMatchScore = 0;
      let reviewSentimentScore = 0;
      let reviewRecencyScore = 0;
      
      if (restaurant.reviews && restaurant.reviews.length > 0) {
        // Sort reviews by time (most recent first)
        const sortedReviews = [...restaurant.reviews].sort((a, b) => b.time - a.time);
        
        // Calculate scores from reviews
        sortedReviews.forEach((review, index) => {
          // Recency factor (more recent reviews have more weight)
          const recencyFactor = 1 - (index / sortedReviews.length);
          
          // Match score based on extracted terms
          const reviewFlavorMatches = review.extractedFlavors?.filter(
            flavor => searchTerms.includes(flavor.toLowerCase())
          ).length || 0;
          
          const reviewDishMatches = review.extractedDishes?.filter(
            dish => searchTerms.some(term => dish.toLowerCase().includes(term.toLowerCase()))
          ).length || 0;
          
          const termMatchScore = (reviewFlavorMatches + reviewDishMatches) * recencyFactor;
          reviewMatchScore += termMatchScore;
          
          // Sentiment score (weighted by recency)
          reviewSentimentScore += (review.sentimentScore || 0) * recencyFactor;
          
          // Recency score
          reviewRecencyScore += recencyFactor;
        });
        
        // Normalize scores
        reviewMatchScore = reviewMatchScore / sortedReviews.length * options.matchWeight;
        reviewSentimentScore = (reviewSentimentScore / sortedReviews.length + 1) / 2 * options.sentimentWeight;
        reviewRecencyScore = reviewRecencyScore / sortedReviews.length * options.recentReviewsWeight;
      }
      
      // Calculate final score
      matchScore = ratingScore + reviewMatchScore + reviewSentimentScore + reviewRecencyScore;
      
      // Add match score to restaurant
      restaurantCopy.matchScore = matchScore;
      return restaurantCopy;
    });
    
    // Sort by match score (highest first)
    return rankedRestaurants.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }
}

export const reviewAnalysisService = new ReviewAnalysisService(); 