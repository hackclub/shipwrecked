/**
 * Island Project Types Configuration
 * Parses the ISLAND_PROJECTS environment variable to provide project type options
 */

export interface IslandProjectType {
  name: string;
  description: string;
}

/**
 * Parse the ISLAND_PROJECTS environment variable
 * Format: "name1#description1#name2#description2#..."
 */
export function parseIslandProjectTypes(): IslandProjectType[] {
  const islandProjectsEnv = process.env.ISLAND_PROJECTS;
  
  console.log('🏝️ ISLAND_PROJECTS env var:', islandProjectsEnv ? 'Found' : 'Not found');
  console.log('🏝️ Raw value:', islandProjectsEnv);
  
  if (!islandProjectsEnv) {
    console.warn('ISLAND_PROJECTS environment variable not found, using default types (none)');
    return [];
  }

  try {
    const parts = islandProjectsEnv.split('#');
    
    // Should have an even number of parts (name/description pairs)
    if (parts.length % 2 !== 0) {
      console.error('ISLAND_PROJECTS format error: should have even number of parts (name/description pairs)');
      return [];
    }

    const projectTypes: IslandProjectType[] = [];
    
    for (let i = 0; i < parts.length; i += 2) {
      const name = parts[i]?.trim();
      const description = parts[i + 1]?.trim();
      
      if (name && description) {
        projectTypes.push({ name, description });
      }
    }
    
    console.log('🏝️ Parsed project types:', projectTypes);
    return projectTypes;
  } catch (error) {
    console.error('Error parsing ISLAND_PROJECTS environment variable:', error);
    return [];
  }
}

/**
 * Get island project types for client-side usage
 * This should be called from an API route since environment variables
 * are not available on the client side
 */
export function getIslandProjectTypesForClient(): IslandProjectType[] {
  return parseIslandProjectTypes();
}