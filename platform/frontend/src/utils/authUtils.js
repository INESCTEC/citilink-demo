const API_URL = import.meta.env.VITE_API_URL;

/**
 * Attempts to refresh the access token using the refresh token
 * @returns {Promise<{success: boolean, token: string|null, error: string|null}>}
 */
export const refreshAccessToken = async () => {
  try {
    // Get the actual refresh token rather than the access token
    const refreshToken = localStorage.getItem("refresh_token");
    
    if (!refreshToken) {
      return { success: false, token: null, error: "No refresh token available" };
    }
    
    // Check if the token might be an access token instead of a refresh token
    try {
      const tokenPayload = refreshToken.split('.')[1];
      const decodedPayload = JSON.parse(atob(tokenPayload));
      
      if (decodedPayload.type === 'access') {
        console.error("Using an access token instead of refresh token");
        return { success: false, token: null, error: "Invalid refresh token type" };
      }
    } catch (e) {
      console.warn("Could not decode token:", e);
      // Continue anyway, the server will validate the token
    }
    
    console.log("Using refresh token for authentication");
    
    const response = await fetch(`${API_URL}/v0/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${refreshToken}`
      }
    });
    
    if (!response.ok) {
      return { 
        success: false, 
        token: null, 
        error: "Failed to refresh token" 
      };
    }
    
    const data = await response.json();
    
    localStorage.setItem("token", data.access_token);
    
    return { 
      success: true, 
      token: data.access_token, 
      error: null 
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { 
      success: false, 
      token: null, 
      error: error.message || "Unknown error during token refresh" 
    };
  }
};
