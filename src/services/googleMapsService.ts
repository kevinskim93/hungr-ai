import { Loader } from '@googlemaps/js-api-loader';

// Types for restaurant data
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  vicinity: string;
  photos?: string[];
  reviews: Review[];
  types: string[];
  matchScore?: number; // Will be calculated based on user input
}

export interface Review {
  authorName: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
  language: string;
  // Extracted data from NLP
  extractedFlavors?: string[];
  extractedDishes?: string[];
  sentimentScore?: number;
}

class GoogleMapsService {
  private apiKey: string;
  private loader: Loader;
  private googleMaps: any = null;
  private placesService: any = null;

  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
    this.loader = new Loader({
      apiKey: this.apiKey,
      version: 'weekly',
      libraries: ['places']
    });
  }

  async initialize(): Promise<boolean> {
    if (!this.apiKey) {
      console.error('Google Maps API key is not defined');
      return false;
    }

    try {
      this.googleMaps = await this.loader.load();
      // Create a dummy div for the PlacesService (required but not displayed)
      const dummyElement = document.createElement('div');
      this.placesService = new this.googleMaps.places.PlacesService(dummyElement);
      return true;
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      return false;
    }
  }

  async searchNearbyRestaurants(
    query: string,
    location: { lat: number; lng: number },
    radius: number = 5000
  ): Promise<Restaurant[]> {
    if (!this.placesService) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Google Maps service not initialized');
      }
    }

    return new Promise((resolve, reject) => {
      const request = {
        location: new this.googleMaps.LatLng(location.lat, location.lng),
        radius,
        type: 'restaurant',
        keyword: query
      };

      this.placesService.nearbySearch(request, (results: any, status: any) => {
        if (status === this.googleMaps.places.PlacesServiceStatus.OK) {
          // Get detailed information for each restaurant including reviews
          this.getRestaurantDetails(results)
            .then(restaurants => resolve(restaurants))
            .catch(error => reject(error));
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  }

  private async getRestaurantDetails(places: any[]): Promise<Restaurant[]> {
    const detailedPlaces: Restaurant[] = [];

    for (const place of places) {
      try {
        const details = await this.getPlaceDetails(place.place_id);
        
        // Extract and format the data we need
        const restaurant: Restaurant = {
          id: details.place_id,
          name: details.name,
          address: details.formatted_address,
          rating: details.rating,
          userRatingsTotal: details.user_ratings_total,
          priceLevel: details.price_level,
          vicinity: details.vicinity,
          photos: details.photos?.map((photo: any) => 
            photo.getUrl({ maxWidth: 400, maxHeight: 300 })
          ),
          reviews: details.reviews?.map((review: any) => ({
            authorName: review.author_name,
            rating: review.rating,
            relativeTimeDescription: review.relative_time_description,
            text: review.text,
            time: review.time,
            language: review.language || 'en'
          })) || [],
          types: details.types || []
        };

        detailedPlaces.push(restaurant);
      } catch (error) {
        console.error(`Error getting details for place ${place.place_id}:`, error);
      }
    }

    return detailedPlaces;
  }

  private getPlaceDetails(placeId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = {
        placeId,
        fields: [
          'name', 'place_id', 'formatted_address', 'rating', 'user_ratings_total',
          'price_level', 'vicinity', 'photos', 'reviews', 'types'
        ]
      };

      this.placesService.getDetails(request, (place: any, status: any) => {
        if (status === this.googleMaps.places.PlacesServiceStatus.OK) {
          resolve(place);
        } else {
          reject(new Error(`Place details API error: ${status}`));
        }
      });
    });
  }

  // Get user's current location
  async getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            // Default to a location (e.g., San Francisco) if geolocation fails
            resolve({ lat: 37.7749, lng: -122.4194 });
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser');
        // Default to a location if geolocation is not supported
        resolve({ lat: 37.7749, lng: -122.4194 });
      }
    });
  }
}

export const googleMapsService = new GoogleMapsService(); 