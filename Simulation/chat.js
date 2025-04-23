// OpenAI API configuration
let OPENAI_API_KEY = ''; // Will be set from environment variable or user input

// Function to set API key
function setApiKey(key) {
    OPENAI_API_KEY = key;
    console.log('API key set successfully');
}

// Function to prompt for API key if not set
function promptForApiKey() {
    if (!OPENAI_API_KEY) {
        const key = prompt('Please enter your OpenAI API key:');
        if (key) {
            setApiKey(key);
            return true;
        }
        return false;
    }
    return true;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Chat state management
let chatHistory = [];

// Chat interface functionality
let chatMessages;
let chatInput;
let sendButton;

// Function to create thinking indicator
function createThinkingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message assistant-message thinking-indicator';
  indicator.innerHTML = `
    <span>Thinking</span>
    <div class="thinking-dot"></div>
    <div class="thinking-dot"></div>
    <div class="thinking-dot"></div>
  `;
  return indicator;
}

// Function to add a message to the chat
function addMessage(message, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
  
  // Format message with line breaks
  const formattedMessage = message.replace(/\n/g, '<br>');
  messageDiv.innerHTML = formattedMessage;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageDiv;
}

// Function to get current simulation data
function getSimulationState() {
    return {
        layout: {
            divisions: document.getElementById('divisions-value').textContent,
            corridorType: document.getElementById('corridor-type-selector').value,
            entryPoint: document.getElementById('entry-selector').value,
            exitPoint: document.getElementById('exit-selector').value,
            desksCount: document.getElementById('desks-value').textContent,
            arrangement: document.getElementById('arrangement-selector').value,
            operatorsCount: document.getElementById('operators-value').textContent,
            operatorSpeed: document.getElementById('speed-value').textContent
        },
        statistics: {
            totalDesks: document.getElementById('total-desks-count').textContent,
            totalOperators: document.getElementById('total-operators-count').textContent,
            desksInteracted: document.getElementById('desks-interacted-count').textContent,
            operatorsCompleted: document.getElementById('operators-completed-count').textContent
        },
        scores: {
            efficiency: document.getElementById('efficiency-value').textContent,
            spaceUtilization: document.getElementById('space-value').textContent,
            comfort: document.getElementById('comfort-value').textContent,
            total: document.getElementById('total-score-value').textContent
        },
        areas: {
            totalStudio: document.getElementById('total-studio-area').textContent,
            mainCorridor: document.getElementById('main-corridor-area').textContent,
            totalDesk: document.getElementById('total-desk-area').textContent,
            totalNonDesk: document.getElementById('total-non-desk-area').textContent,
            divisionTotal: document.getElementById('division-total-area').textContent,
            divisionDesk: document.getElementById('division-desk-area').textContent,
            divisionNonDesk: document.getElementById('division-non-desk-area').textContent
        },
        trails: {
            shortest: document.getElementById('shortest-trail').textContent,
            longest: document.getElementById('longest-trail').textContent,
            average: document.getElementById('average-trail').textContent
        }
    };
}

// Function to send message to OpenAI API
async function sendToOpenAI(message) {
    if (!promptForApiKey()) {
        return 'Please set your API key to use the AI assistant.';
    }

    try {
        // Get current simulation state
        const simState = getSimulationState();
        
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant for a spatial simulation of a studio environment. You have access to the following:

1. Semantic Model:
You are an AI assistant for a spatial simulation of a studio environment. You have access to the following semantic model:

Entities and their attributes:
1. Studio: total_area, grid_resolution, number_of_divisions, entry_points, exit_points
2. Division: division_id, boundary_coordinates, assigned_desks, assigned_chairs, is_accessible
3. Desk: desk_id, size, location, orientation, assigned_chair, interaction_duration, is_occupied
4. Agent: agent_id, type, current_position, current_division, movement_state, assigned_task, assigned_chair, current_desk, interaction_timer, path
5. Path: waypoints, start_point, end_point, current_step
6. Heatmap: grid, max_visits, last_updated
7. Chair: chair_id, location, assigned_desk, is_occupied, is_movable

Rules:
- Each desk is assigned exactly one chair, and vice versa
- A chair must be placed within 3 feet of its assigned desk
- An agent may only interact with a desk while seated on its assigned chair
- During interaction, the agent's movement_state is "interacting" and a countdown timer tracks interaction_duration
- While a desk is occupied, it cannot be used by another agent
- Agents may only move through unoccupied, walkable grid tiles
- Agents must maintain a 3ft clearance between one another when moving
- A division may only contain one desk arrangement type (row, column, cluster)
- After interacting with their required number of desks, agents must exit the studio

Actions:
- An agent may "enter" the studio through an entry point
- An agent may "move" toward a target location
- An agent may "sit" in a chair
- An agent may "interact" with a desk for interaction_duration seconds
- An agent may "stand" and vacate the chair
- An agent may "exit" through a designated exit point

Use this semantic model to provide accurate, context-aware responses about the simulation. When answering questions, refer to the specific entities, attributes, rules, and actions that are relevant to the query.

2. Current Simulation State:
Layout Configuration:
- Divisions: ${simState.layout.divisions}
- Corridor Type: ${simState.layout.corridorType}
- Entry Point: ${simState.layout.entryPoint}
- Exit Point: ${simState.layout.exitPoint}
- Number of Desks: ${simState.layout.desksCount}
- Desk Arrangement: ${simState.layout.arrangement}
- Number of Operators: ${simState.layout.operatorsCount}
- Operator Speed: ${simState.layout.operatorSpeed}

Current Statistics:
- Total Desks: ${simState.statistics.totalDesks}
- Total Operators: ${simState.statistics.totalOperators}
- Desks Interacted: ${simState.statistics.desksInteracted}
- Operators Completed: ${simState.statistics.operatorsCompleted}

Layout Scores:
- Efficiency: ${simState.scores.efficiency}
- Space Utilization: ${simState.scores.spaceUtilization}
- Comfort: ${simState.scores.comfort}
- Total Score: ${simState.scores.total}

Area Statistics:
Studio:
- Total Area: ${simState.areas.totalStudio} sq ft
- Main Corridor: ${simState.areas.mainCorridor} sq ft
- Total Desk Area: ${simState.areas.totalDesk} sq ft
- Non-Desk Area: ${simState.areas.totalNonDesk} sq ft

Per Division:
- Total Area: ${simState.areas.divisionTotal} sq ft
- Desk Area: ${simState.areas.divisionDesk} sq ft
- Non-Desk Area: ${simState.areas.divisionNonDesk} sq ft

Trail Statistics:
- Shortest Trail: ${simState.trails.shortest} ft
- Longest Trail: ${simState.trails.longest} ft
- Average Trail: ${simState.trails.average} ft

Analyze this data to provide insights about the current simulation state and make recommendations for improvements. Consider relationships between different metrics and suggest specific parameter adjustments that could optimize the layout.`
                    },
                    ...chatHistory,
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        return 'Sorry, I encountered an error while processing your request.';
    }
}

// Function to handle user input
async function handleUserInput() {
  const message = chatInput.value.trim();
  if (message) {
    addMessage(message, true);
    chatInput.value = '';
    
    // Show thinking indicator
    const thinkingIndicator = createThinkingIndicator();
    chatMessages.appendChild(thinkingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
      // Get response from OpenAI
      const response = await sendToOpenAI(message);
      
      // Remove thinking indicator and add actual response
      chatMessages.removeChild(thinkingIndicator);
      addMessage(response);
      
      // Update chat history
      chatHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );
    } catch (error) {
      // Remove thinking indicator and show error
      chatMessages.removeChild(thinkingIndicator);
      addMessage('Sorry, I encountered an error while processing your request. Please try again.');
      console.error('Error:', error);
    }
  }
}

// Function to get AI response (placeholder - replace with actual AI integration)
function getAIResponse(message) {
  const responses = {
    'hello': 'Hello! How can I help you with the simulation?',
    'help': 'I can help you understand the simulation parameters, explain the layout scores, or provide suggestions for optimization.',
    'score': 'The layout score is calculated based on efficiency, space utilization, and comfort metrics.',
    'default': 'I understand you want to know about: ' + message + '. Let me analyze the simulation data to provide a detailed response.'
  };

  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }
  return responses.default;
}

// Initialize chat functionality
function initializeChat() {
    // Get DOM elements
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendButton = document.getElementById('send-button');
    const expandButton = document.getElementById('expand-ai');
    const aiSection = document.getElementById('ai-assistant-section');
    const collapseButton = document.querySelector('.collapse-button');
    
    if (!chatMessages || !chatInput || !sendButton || !expandButton || !aiSection || !collapseButton) {
        console.error('Required chat elements not found in the DOM');
        return;
    }

    // Add send icon to button
    sendButton.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
    `;
    
    // Function to collapse AI section
    function collapseAI() {
        aiSection.classList.remove('expanded');
        aiSection.classList.add('collapsed');
        expandButton.classList.remove('expanded');
        // Scroll the left panel back to where it was
        document.getElementById('left-panel').scrollTo(0, expandButton.offsetTop - 20);
    }

    // Function to expand AI section
    function expandAI() {
        aiSection.classList.remove('collapsed');
        aiSection.classList.add('expanded');
        expandButton.classList.add('expanded');
        // Scroll chat to bottom when expanded
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add event listeners for chat
    sendButton.addEventListener('click', handleUserInput);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    // Add event listener for expand/collapse
    expandButton.addEventListener('click', () => {
        const isExpanded = aiSection.classList.contains('expanded');
        if (isExpanded) {
            collapseAI();
        } else {
            expandAI();
        }
    });

    // Add event listener for collapse button
    collapseButton.addEventListener('click', collapseAI);
    
    // Add welcome message with formatted content
    const welcomeMessage = `Hello! I'm your AI assistant for this spatial simulation. I can help you with:
    
• Understanding the simulation's entities and rules
• Optimizing layout and space utilization
• Analyzing agent behavior and movement
• Interpreting simulation data and statistics

What would you like to know about the simulation?`;
    
    addMessage(welcomeMessage);
}

// Initialize chat when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeChat); 