const express = require('express');
const app = express();
const PORT = 3000;

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize with empty profile data structure
let playerProfile = {
  name: '',
  schoolEmail: '',
  phoneNumber: '',
  utr: '',
  ntrp: '',
  skillLevel: '',
  availability: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  }
};

// Initialize with empty events data structure
let userEvents = [];
let allEvents = [];

// Sample players data for match finding
const samplePlayers = [
  {
    id: 1,
    name: 'Alex Johnson',
    schoolEmail: 'alex.johnson@university.edu',
    phoneNumber: '(555) 123-4567',
    utr: '8.2',
    ntrp: '4.0',
    skillLevel: 'Intermediate (3.5-4.0)',
    availability: {
      monday: ['6:00 PM', '7:00 PM'],
      tuesday: ['5:00 PM', '6:00 PM'],
      wednesday: ['7:00 PM', '8:00 PM'],
      thursday: ['6:00 PM', '7:00 PM'],
      friday: ['5:00 PM', '6:00 PM'],
      saturday: ['9:00 AM', '10:00 AM'],
      sunday: ['10:00 AM', '11:00 AM']
    },
    profilePicture: null
  },
  {
    id: 2,
    name: 'Sarah Chen',
    schoolEmail: 'sarah.chen@university.edu',
    phoneNumber: '(555) 234-5678',
    utr: '7.8',
    ntrp: '3.0',
    skillLevel: 'Advanced Beginner (2.5-3.0)',
    availability: {
      monday: ['5:00 PM', '6:00 PM'],
      tuesday: ['6:00 PM', '7:00 PM'],
      wednesday: ['5:00 PM', '6:00 PM'],
      thursday: ['7:00 PM', '8:00 PM'],
      friday: ['6:00 PM', '7:00 PM'],
      saturday: ['10:00 AM', '11:00 AM'],
      sunday: ['2:00 PM', '3:00 PM']
    },
    profilePicture: null
  },
  {
    id: 3,
    name: 'Mike Rodriguez',
    schoolEmail: 'mike.rodriguez@university.edu',
    phoneNumber: '(555) 345-6789',
    utr: '8.5',
    ntrp: '4.5',
    skillLevel: 'Advanced Intermediate (4.5-5.0)',
    availability: {
      monday: ['7:00 PM', '8:00 PM'],
      tuesday: ['5:00 PM', '6:00 PM'],
      wednesday: ['6:00 PM', '7:00 PM'],
      thursday: ['5:00 PM', '6:00 PM'],
      friday: ['7:00 PM', '8:00 PM'],
      saturday: ['2:00 PM', '3:00 PM'],
      sunday: ['1:00 PM', '2:00 PM']
    },
    profilePicture: null
  },
  {
    id: 4,
    name: 'Emma Davis',
    schoolEmail: 'emma.davis@university.edu',
    phoneNumber: '(555) 456-7890',
    utr: '9.1',
    ntrp: '5.5',
    skillLevel: 'Advanced (5.5-6.0)',
    availability: {
      monday: ['6:00 PM', '7:00 PM'],
      tuesday: ['7:00 PM', '8:00 PM'],
      wednesday: ['6:00 PM', '7:00 PM'],
      thursday: ['6:00 PM', '7:00 PM'],
      friday: ['6:00 PM', '7:00 PM'],
      saturday: ['2:00 PM', '3:00 PM'],
      sunday: ['2:00 PM', '3:00 PM']
    },
    profilePicture: null
  },
  {
    id: 5,
    name: 'David Kim',
    schoolEmail: 'david.kim@university.edu',
    phoneNumber: '(555) 567-8901',
    utr: '6.5',
    ntrp: '2.0',
    skillLevel: 'Beginner (1.0-2.0)',
    availability: {
      monday: ['5:00 PM', '6:00 PM'],
      tuesday: ['6:00 PM', '7:00 PM'],
      wednesday: ['5:00 PM', '6:00 PM'],
      thursday: ['5:00 PM', '6:00 PM'],
      friday: ['5:00 PM', '6:00 PM'],
      saturday: ['10:00 AM', '11:00 AM'],
      sunday: ['10:00 AM', '11:00 AM']
    },
    profilePicture: null
  }
];

// Sample profile data (you can replace this with your actual data)
const sampleProfile = {
  name: 'Vincent Wu',
  schoolEmail: 'vincent.wu@university.edu',
  phoneNumber: '(555) 987-6543',
  utr: '7.5',
  ntrp: '3.5',
  skillLevel: 'Intermediate (3.5-4.0)',
  availability: {
    monday: ['6:00 PM', '7:00 PM', '8:00 PM'],
    tuesday: ['5:00 PM', '6:00 PM'],
    wednesday: ['7:00 PM', '8:00 PM'],
    thursday: ['6:00 PM', '7:00 PM'],
    friday: ['5:00 PM', '6:00 PM', '7:00 PM'],
    saturday: ['9:00 AM', '10:00 AM', '2:00 PM'],
    sunday: ['10:00 AM', '11:00 AM']
  }
};

app.use(express.json({ limit: '10mb' })); // Middleware to parse JSON bodies with increased limit for profile pictures

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Tennis App Backend API',
    endpoints: {
      'GET /api/profile': 'Get current profile data',
      'PUT /api/profile': 'Update profile data',
      'GET /api/profile/sample': 'Get sample profile data'
    }
  });
});

// API endpoint to get profile data
app.get('/api/profile', (req, res) => {
  console.log('GET /api/profile - Returning profile data');
  res.json(playerProfile);
});

// API endpoint to get sample profile data
app.get('/api/profile/sample', (req, res) => {
  console.log('GET /api/profile/sample - Returning sample profile data');
  res.json(sampleProfile);
});

// API endpoint to update profile data
app.put('/api/profile', (req, res) => {
  console.log('PUT /api/profile - Updating profile with:', {
    ...req.body,
    profilePicture: req.body.profilePicture ? `${req.body.profilePicture.substring(0, 50)}...` : 'No profile picture'
  });
  
  try {
    // Validate required fields - allow empty strings for initial setup
    const { name, schoolEmail, phoneNumber, skillLevel } = req.body;
    if (
      name === undefined || name === null ||
      schoolEmail === undefined || schoolEmail === null ||
      phoneNumber === undefined || phoneNumber === null ||
      skillLevel === undefined || skillLevel === null
    ) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, schoolEmail, phoneNumber, skillLevel' 
      });
    }

    // Update the profile
    playerProfile = {
      ...playerProfile,
      ...req.body,
      // Ensure availability is properly structured
      availability: {
        monday: req.body.availability?.monday || [],
        tuesday: req.body.availability?.tuesday || [],
        wednesday: req.body.availability?.wednesday || [],
        thursday: req.body.availability?.thursday || [],
        friday: req.body.availability?.friday || [],
        saturday: req.body.availability?.saturday || [],
        sunday: req.body.availability?.sunday || []
      }
    };

    // Log profile picture status
    if (req.body.profilePicture) {
      console.log('Profile picture updated - Size:', req.body.profilePicture.length, 'characters');
    } else {
      console.log('No profile picture in update');
    }

    console.log('Profile updated successfully');
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: playerProfile 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Events endpoints
app.get('/api/events', (req, res) => {
  console.log('GET /api/events - Returning all events');
  res.json(allEvents);
});

app.get('/api/events/user', (req, res) => {
  console.log('GET /api/events/user - Returning user events');
  res.json(userEvents);
});

app.post('/api/events', (req, res) => {
  console.log('POST /api/events - Creating new event:', req.body);
  
  try {
    const { date, time, duration, participants, location, skillLevel, description } = req.body;
    
    if (!date || !time || !location || !skillLevel) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: date, time, location, skillLevel' 
      });
    }

    const newEvent = {
      id: Date.now().toString(),
      date,
      time,
      duration,
      participants,
      location,
      skillLevel,
      description,
      createdBy: playerProfile.name || 'Anonymous',
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    allEvents.push(newEvent);
    userEvents.push(newEvent);

    console.log('Event created successfully');
    res.json({ 
      success: true, 
      message: 'Event created successfully',
      event: newEvent 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

app.delete('/api/events/:id', (req, res) => {
  console.log('DELETE /api/events/:id - Deleting event:', req.params.id);
  
  try {
    const eventId = req.params.id;
    
    // Remove from all events
    allEvents = allEvents.filter(event => event.id !== eventId);
    
    // Remove from user events
    userEvents = userEvents.filter(event => event.id !== eventId);

    console.log('Event deleted successfully');
    res.json({ 
      success: true, 
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Match finding endpoints
app.get('/api/matches/compatible-players', (req, res) => {
  console.log('GET /api/matches/compatible-players - Finding compatible players');
  
  try {
    const { skillLevel, dayOfWeek, timeOfDay } = req.query;
    
    // Calculate compatibility scores for each player
    const compatiblePlayers = samplePlayers.map(player => {
      let score = 0;
      let availabilityMatches = [];
      
      // Skill level compatibility (40% weight)
      if (skillLevel && player.skillLevel.toLowerCase().includes(skillLevel.toLowerCase())) {
        score += 40;
      }
      
      // Availability compatibility (60% weight)
      if (dayOfWeek && timeOfDay) {
        const day = dayOfWeek.toLowerCase();
        const playerTimes = player.availability[day] || [];
        
        // Check if any time slots match the requested time of day
        const timeMatches = playerTimes.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          if (timeOfDay === 'morning' && hour >= 6 && hour < 12) return true;
          if (timeOfDay === 'afternoon' && hour >= 12 && hour < 18) return true;
          if (timeOfDay === 'evening' && hour >= 18 && hour < 22) return true;
          return false;
        });
        
        if (timeMatches.length > 0) {
          score += 60;
          availabilityMatches = timeMatches.map(time => `${dayOfWeek} ${time}`);
        }
      } else if (dayOfWeek) {
        // If only day is specified, check if player has any availability on that day
        const day = dayOfWeek.toLowerCase();
        const playerTimes = player.availability[day] || [];
        if (playerTimes.length > 0) {
          score += 30;
          availabilityMatches = playerTimes.map(time => `${dayOfWeek} ${time}`);
        }
      } else if (timeOfDay) {
        // If only time is specified, check all days
        const allTimes = Object.entries(player.availability).flatMap(([day, times]) =>
          times.map(time => ({ day, time }))
        );
        
        const timeMatches = allTimes.filter(({ time }) => {
          const hour = parseInt(time.split(':')[0]);
          if (timeOfDay === 'morning' && hour >= 6 && hour < 12) return true;
          if (timeOfDay === 'afternoon' && hour >= 12 && hour < 18) return true;
          if (timeOfDay === 'evening' && hour >= 18 && hour < 22) return true;
          return false;
        });
        
        if (timeMatches.length > 0) {
          score += 30;
          availabilityMatches = timeMatches.map(({ day, time }) => `${day} ${time}`);
        }
      } else {
        // No filters - give base score based on skill level match
        if (skillLevel && player.skillLevel.toLowerCase().includes(skillLevel.toLowerCase())) {
          score = 40;
        } else {
          score = 20; // Base score for all players
        }
      }
      
      return {
        ...player,
        matchScore: score,
        availabilityMatches
      };
    }).filter(player => player.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
    
    console.log(`Found ${compatiblePlayers.length} compatible players`);
    res.json(compatiblePlayers);
  } catch (error) {
    console.error('Error finding compatible players:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

app.get('/api/matches/available-events', (req, res) => {
  console.log('GET /api/matches/available-events - Finding available events');
  
  try {
    const { skillLevel, location, date } = req.query;
    
    // Filter events based on criteria
    let filteredEvents = allEvents.filter(event => {
      // Filter by skill level
      if (skillLevel && !event.skillLevel.toLowerCase().includes(skillLevel.toLowerCase())) {
        return false;
      }
      
      // Filter by location
      if (location && !event.location.toLowerCase().includes(location.toLowerCase())) {
        return false;
      }
      
      // Filter by date (show only future events)
      if (date) {
        const eventDate = new Date(event.date);
        const filterDate = new Date(date);
        if (eventDate < filterDate) {
          return false;
        }
      } else {
        // Default: show only future events
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (eventDate < today) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort by date (earliest first)
    filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Found ${filteredEvents.length} available events`);
    res.json(filteredEvents);
  } catch (error) {
    console.error('Error finding available events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Tennis App Backend'
  });
});

app.listen(PORT, () => {
  console.log(`🎾 Tennis App Backend Server is running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/profile - Get current profile`);
  console.log(`   PUT  /api/profile - Update profile`);
  console.log(`   GET  /api/profile/sample - Get sample profile`);
  console.log(`   GET  /api/events - Get all events`);
  console.log(`   GET  /api/events/user - Get user events`);
  console.log(`   POST /api/events - Create new event`);
  console.log(`   DELETE /api/events/:id - Delete event`);
  console.log(`   GET  /api/matches/compatible-players - Find compatible players`);
  console.log(`   GET  /api/matches/available-events - Find available events`);
  console.log(`   GET  /api/health - Health check`);
});