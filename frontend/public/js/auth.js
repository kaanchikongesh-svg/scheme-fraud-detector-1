/**
 * SchemeSecure AI — Authentication & Session Manager
 */

const Auth = {
  // Get current user data
  getUser: () => {
    try {
      const user = localStorage.getItem("govkavach_user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  // Get current access token
  getToken: () => localStorage.getItem("govkavach_token"),

  // Check if user is logged in
  isAuthenticated: () => !!localStorage.getItem("govkavach_token"),

  // Login handler
  login: async (email, password) => {
    try {
      const res = await api.auth.login({ email, password });
      if (res.access_token) {
        localStorage.setItem("govkavach_token", res.access_token);
        localStorage.setItem("govkavach_user", JSON.stringify(res.user));
        showToast(`Welcome back, ${res.user.name}!`, "success");
        return { success: true, user: res.user };
      }
      throw new Error("Invalid login response");
    } catch (err) {
      showToast(err.message || "Failed to log in", "error");
      return { success: false, error: err.message };
    }
  },

  // Register handler
  register: async (userData) => {
    try {
      const res = await api.auth.register(userData);
      if (res.access_token) {
        localStorage.setItem("govkavach_token", res.access_token);
        localStorage.setItem("govkavach_user", JSON.stringify(res.user));
        showToast(`Account created successfully! Welcome, ${res.user.name}.`, "success");
        return { success: true, user: res.user };
      }
      throw new Error("Registration response invalid");
    } catch (err) {
      showToast(err.message || "Registration failed", "error");
      return { success: false, error: err.message };
    }
  },

  // Logout handler
  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem("govkavach_token");
      localStorage.removeItem("govkavach_user");
      window.location.href = "login.html";
    }
  },

  // Initialize UI on page load
  initUI: () => {
    const user = Auth.getUser();
    const userContainer = document.getElementById("header-user-container");
    
    if (userContainer) {
      if (user) {
        const initials = (user.name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        userContainer.innerHTML = `
          <div class="user-pill">
            <div class="user-avatar">${initials}</div>
            <div>
              <div style="font-weight:600; font-size:0.85rem;">${user.name}</div>
              <div class="user-role-badge">${(user.role || 'citizen').replace('_', ' ')}</div>
            </div>
            <button onclick="Auth.logout()" class="btn btn-sm btn-outline" style="margin-left:8px; padding: 4px 8px;" title="Logout">
              Logout
            </button>
          </div>
        `;
      } else {
        userContainer.innerHTML = `
          <a href="login.html" class="btn btn-sm btn-primary">Sign In</a>
        `;
      }
    }

    // Highlight active nav item
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.getAttribute("href") === currentPath) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  },

  // Require auth on protected pages
  requireAuth: () => {
    if (!Auth.isAuthenticated()) {
      window.location.href = "login.html";
    }
  }
};

// Auto-run UI init on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  Auth.initUI();
});
