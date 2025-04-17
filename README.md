# GSAPP Studio Space Circulation Simulation

A web-based simulation tool for analyzing and optimizing circulation patterns in the GSAPP studio space.

## Features

- 3D visualization of the studio space
- Adjustable parameters for space configuration
- Real-time simulation of people movement
- Density and distance-based coloring
- Trail visualization
- Interactive controls

## Setup

1. Make sure you have Node.js installed (version 14 or higher)
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`

## Usage

The simulation interface consists of two main parts:

1. **3D Visualization**: The main view showing the studio space and people movement
2. **Control Panel**: The right sidebar containing various parameters to adjust

### Adjustable Parameters

- **Number of Divisions**: Control how the space is divided
- **Layout Arrangement**: Choose between grid, random, or cluster layouts
- **Number of Entrances/Exits**: Configure access points
- **Number of People**: Adjust the population density
- **Speed**: Control the movement speed
- **Visualization Options**:
  - Show/hide trails
  - Color by distance
  - Color by density

## Future Enhancements

- Import custom 3D models of the studio space
- Add more sophisticated pathfinding algorithms
- Implement heat maps for density analysis
- Add export functionality for analysis data
- Support for multiple floor levels

## Technologies Used

- React
- Three.js
- React Three Fiber
- Styled Components 