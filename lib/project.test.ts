import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { calculateProgressMetrics, getProjectHackatimeHours, getProjectApprovedHours, ProgressMetrics } from './project';

// Helper function to create a mock project
function createMockProject(options: {
  projectID?: string;
  shipped?: boolean;
  viral?: boolean;
  rawHours?: number;
  hackatimeLinks?: Array<{
    rawHours?: number;
    hoursOverride?: number | null;
  }>;
}) {
  return {
    projectID: options.projectID || 'test-project-' + Math.random(),
    name: 'Test Project',
    shipped: options.shipped || false,
    viral: options.viral || false,
    rawHours: options.rawHours || 0,
    hackatimeLinks: options.hackatimeLinks || [],
  };
}

describe('getProjectHackatimeHours', () => {
  test('should return 0 for null/undefined project', () => {
    assert.equal(getProjectHackatimeHours(null), 0);
    assert.equal(getProjectHackatimeHours(undefined), 0);
  });

  test('should use rawHours when no hackatimeLinks', () => {
    const project = createMockProject({ rawHours: 10 });
    assert.equal(getProjectHackatimeHours(project), 10);
  });

  test('should use rawHours when hackatimeLinks is empty', () => {
    const project = createMockProject({ rawHours: 15, hackatimeLinks: [] });
    assert.equal(getProjectHackatimeHours(project), 15);
  });

  test('should sum rawHours from hackatimeLinks when present', () => {
    const project = createMockProject({
      rawHours: 100, // Should be ignored
      hackatimeLinks: [
        { rawHours: 5 },
        { rawHours: 8 },
        { rawHours: 3 }
      ]
    });
    assert.equal(getProjectHackatimeHours(project), 16);
  });

  test('should use hoursOverride when available', () => {
    const project = createMockProject({
      hackatimeLinks: [
        { rawHours: 10, hoursOverride: 15 },
        { rawHours: 5, hoursOverride: null }, // null should use rawHours
        { rawHours: 8 } // undefined should use rawHours
      ]
    });
    assert.equal(getProjectHackatimeHours(project), 15 + 5 + 8);
  });

  test('should handle zero hoursOverride', () => {
    const project = createMockProject({
      hackatimeLinks: [
        { rawHours: 10, hoursOverride: 0 }
      ]
    });
    assert.equal(getProjectHackatimeHours(project), 0);
  });

  test('should handle missing rawHours in links', () => {
    const project = createMockProject({
      hackatimeLinks: [
        { rawHours: undefined },
        { rawHours: 5 }
      ]
    });
    assert.equal(getProjectHackatimeHours(project), 5);
  });
});

describe('getProjectApprovedHours', () => {
  test('should return 0 for null/undefined project', () => {
    assert.equal(getProjectApprovedHours(null), 0);
    assert.equal(getProjectApprovedHours(undefined), 0);
  });

  test('should return 0 when no hoursOverride is set', () => {
    const project = createMockProject({
      rawHours: 10,
      hackatimeLinks: [
        { rawHours: 5 }, // No hoursOverride
        { rawHours: 8 }  // No hoursOverride
      ]
    });
    assert.equal(getProjectApprovedHours(project), 0);
  });

  test('should only count hoursOverride as approved hours', () => {
    const project = createMockProject({
      rawHours: 100, // Should be ignored
      hackatimeLinks: [
        { rawHours: 10, hoursOverride: 8 },   // 8 approved hours
        { rawHours: 5, hoursOverride: null }, // 0 approved hours (null override)
        { rawHours: 15 }                      // 0 approved hours (no override)
      ]
    });
    assert.equal(getProjectApprovedHours(project), 8);
  });

  test('should handle zero hoursOverride as approved', () => {
    const project = createMockProject({
      hackatimeLinks: [
        { rawHours: 10, hoursOverride: 0 } // 0 approved hours (explicitly set to 0)
      ]
    });
    assert.equal(getProjectApprovedHours(project), 0);
  });

  test('should sum all hoursOverride values', () => {
    const project = createMockProject({
      hackatimeLinks: [
        { rawHours: 10, hoursOverride: 5 },
        { rawHours: 8, hoursOverride: 3 },
        { rawHours: 12, hoursOverride: 7 }
      ]
    });
    assert.equal(getProjectApprovedHours(project), 15); // 5 + 3 + 7
  });
});

describe('calculateProgressMetrics', () => {
  test('should handle null/undefined/empty projects array', () => {
    const expectedEmpty: ProgressMetrics = {
      shippedHours: 0,
      viralHours: 0,
      otherHours: 0,
      totalHours: 0,
      totalPercentage: 0,
      rawHours: 0,
      currency: 0
    };

    assert.deepEqual(calculateProgressMetrics(null as any), expectedEmpty);
    assert.deepEqual(calculateProgressMetrics(undefined as any), expectedEmpty);
    assert.deepEqual(calculateProgressMetrics([]), expectedEmpty);
  });

  test('should calculate basic progress for single projects', () => {
    // Test viral project with approved hours
    const viralProject = [createMockProject({ 
      viral: true, 
      rawHours: 10,
      hackatimeLinks: [{ rawHours: 10, hoursOverride: 10 }] // Has approved hours
    })];
    const viralResult = calculateProgressMetrics(viralProject);
    assert.equal(viralResult.viralHours, 10);
    assert.equal(viralResult.shippedHours, 0);
    assert.equal(viralResult.otherHours, 0);
    assert.equal(viralResult.totalHours, 10);
    assert.equal(viralResult.rawHours, 10);
    assert.equal(viralResult.currency, 0); // No approved hours = no clamshells

    // Test shipped (non-viral) project with approved hours
    const shippedProject = [createMockProject({ 
      shipped: true, 
      viral: false, 
      rawHours: 12,
      hackatimeLinks: [{ rawHours: 12, hoursOverride: 12 }] // Has approved hours
    })];
    const shippedResult = calculateProgressMetrics(shippedProject);
    assert.equal(shippedResult.shippedHours, 12);
    assert.equal(shippedResult.viralHours, 0);
    assert.equal(shippedResult.otherHours, 0);
    assert.equal(shippedResult.totalHours, 12);
    assert.equal(shippedResult.rawHours, 12);
    assert.equal(shippedResult.currency, 0); // No excess hours beyond 15

    // Test unshipped project
    const unshippedProject = [createMockProject({ shipped: false, viral: false, rawHours: 8 })];
    const unshippedResult = calculateProgressMetrics(unshippedProject);
    assert.equal(unshippedResult.otherHours, 8);
    assert.equal(unshippedResult.shippedHours, 0);
    assert.equal(unshippedResult.viralHours, 0);
    assert.equal(unshippedResult.totalHours, 8);
    assert.equal(unshippedResult.rawHours, 8);
    assert.equal(unshippedResult.currency, 0); // Unshipped projects don't generate clamshells
  });

  test('should cap hours per project at 15 for island calculation', () => {
    const projects = [
      createMockProject({ 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [{ rawHours: 20, hoursOverride: 20 }] // Has approved hours
      }), // Should be capped at 15
    ];
    const result = calculateProgressMetrics(projects);
    assert.equal(result.shippedHours, 15);
    assert.equal(result.totalHours, 15);
    assert.equal(result.rawHours, 20);
  });

  test('should cap unshipped projects at 14.75 hours', () => {
    const projects = [
      createMockProject({ shipped: false, rawHours: 20 }), // Should be capped at 14.75
    ];
    const result = calculateProgressMetrics(projects);
    assert.equal(result.otherHours, 14.75);
    assert.equal(result.totalHours, 14.75);
    assert.equal(result.rawHours, 20);
  });

  test('should only use top 4 projects for island calculation', () => {
    const projects = [
      createMockProject({ 
        projectID: '1', 
        shipped: true, 
        rawHours: 15,
        hackatimeLinks: [{ rawHours: 15, hoursOverride: 15 }]
      }),
      createMockProject({ 
        projectID: '2', 
        shipped: true, 
        rawHours: 14,
        hackatimeLinks: [{ rawHours: 14, hoursOverride: 14 }]
      }),
      createMockProject({ 
        projectID: '3', 
        shipped: true, 
        rawHours: 13,
        hackatimeLinks: [{ rawHours: 13, hoursOverride: 13 }]
      }),
      createMockProject({ 
        projectID: '4', 
        shipped: true, 
        rawHours: 12,
        hackatimeLinks: [{ rawHours: 12, hoursOverride: 12 }]
      }),
      createMockProject({ 
        projectID: '5', 
        shipped: true, 
        rawHours: 11,
        hackatimeLinks: [{ rawHours: 11, hoursOverride: 11 }]
      }), // Should be ignored for island
    ];
    const result = calculateProgressMetrics(projects);
    
    // Island calculation: only top 4 projects (15+14+13+12 = 54)
    assert.equal(result.shippedHours, 54);
    assert.equal(result.totalHours, 54);
    
    // Raw hours: all projects (15+14+13+12+11 = 65)
    assert.equal(result.rawHours, 65);
  });

  test('should calculate clamshells correctly for simple case', () => {
    const phi = (1 + Math.sqrt(5)) / 2; // ≈ 1.618
    
    const projects = [
      // Top 4 project with approved excess hours
      createMockProject({ 
        projectID: '1', 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [
          { rawHours: 20, hoursOverride: 20 } // 20 approved hours, 5 excess beyond 15
        ]
      }),
      // Non-top-4 shipped project with approved hours
      createMockProject({ 
        projectID: '2', 
        shipped: true, 
        rawHours: 5,
        hackatimeLinks: [
          { rawHours: 5, hoursOverride: 5 } // 5 approved hours
        ]
      }),
    ];
    
    const result = calculateProgressMetrics(projects);
    
    // Both projects are in top 4 since we only have 2 projects
    // Expected clamshells: (20-15) * phi * 10 = 5 * phi * 10
    const expectedCurrency = Math.floor(5 * (phi * 10));
    assert.equal(result.currency, expectedCurrency);
  });

  test('FIXED: only approved hours should generate clamshells', () => {
    const phi = (1 + Math.sqrt(5)) / 2;
    
    const projects = [
      // Shipped project with raw hours but NO approved hours - should NOT generate clamshells OR count as shipped hours
      createMockProject({ 
        projectID: '1', 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [
          { rawHours: 20 } // No hoursOverride = no approved hours
        ]
      }),
      // Shipped project with approved hours - SHOULD generate clamshells AND count as shipped hours
      createMockProject({ 
        projectID: '2', 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [
          { rawHours: 20, hoursOverride: 18 } // 18 approved hours
        ]
      }),
    ];
    
    const result = calculateProgressMetrics(projects);
    
    console.log('BUG FIXED:');
    console.log('  Project 1 (shipped, no approved hours): should NOT generate clamshells OR count as shipped hours');
    console.log('  Project 2 (shipped, 18 approved hours): should generate clamshells AND count as shipped hours');
    console.log('  Actual currency:', result.currency);
    console.log('  Actual shippedHours:', result.shippedHours);
    console.log('  Actual otherHours:', result.otherHours);
    
    // Fixed behavior: only project 2 generates clamshells for approved excess hours
    // Project 2 has 3 approved excess hours beyond 15 (18 - 15 = 3)
    const expectedCurrency = Math.floor(3 * (phi * 10));
    console.log('  Expected currency (fixed):', expectedCurrency);
    
    assert.equal(result.currency, expectedCurrency, 'Only approved hours should generate clamshells');
    assert.equal(result.shippedHours, 15, 'Only shipped projects with approved hours should count as shipped hours');
    assert.equal(result.otherHours, 14.75, 'Shipped projects with no approved hours should count as other hours (capped at 14.75)');
    assert.equal(result.totalHours, 29.75, 'Total should be shippedHours + otherHours = 15 + 14.75');
  });

  test('should cap total hours at 60 for percentage calculation', () => {
    const projects = [
      createMockProject({ 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [{ rawHours: 20, hoursOverride: 20 }]
      }),
      createMockProject({ 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [{ rawHours: 20, hoursOverride: 20 }]
      }),
      createMockProject({ 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [{ rawHours: 20, hoursOverride: 20 }]
      }),
      createMockProject({ 
        shipped: true, 
        rawHours: 20,
        hackatimeLinks: [{ rawHours: 20, hoursOverride: 20 }]
      }), // Total would be 80, but capped at 60
    ];
    
    const result = calculateProgressMetrics(projects);
    assert.equal(result.totalHours, 60);
    assert.equal(result.totalPercentage, 100);
    assert.equal(result.rawHours, 80);
  });

  test('should calculate percentage correctly', () => {
    const projects = [
      createMockProject({ 
        shipped: true, 
        rawHours: 15,
        hackatimeLinks: [{ rawHours: 15, hoursOverride: 15 }]
      }),
      createMockProject({ 
        shipped: true, 
        rawHours: 15,
        hackatimeLinks: [{ rawHours: 15, hoursOverride: 15 }]
      }),
    ];
    
    const result = calculateProgressMetrics(projects);
    assert.equal(result.totalHours, 30);
    assert.equal(result.totalPercentage, 50); // 30/60 * 100 = 50%
  });

  test('should handle mixed project types correctly', () => {
    const projects = [
      createMockProject({ 
        projectID: '1', 
        shipped: true, 
        viral: true, 
        rawHours: 15,
        hackatimeLinks: [{ rawHours: 15, hoursOverride: 15 }] // Has approved hours
      }), // Viral
      createMockProject({ 
        projectID: '2', 
        shipped: true, 
        viral: false, 
        rawHours: 12,
        hackatimeLinks: [{ rawHours: 12, hoursOverride: 12 }] // Has approved hours
      }), // Shipped only
      createMockProject({ projectID: '3', shipped: false, viral: false, rawHours: 10 }), // Unshipped
      createMockProject({ projectID: '4', shipped: false, viral: false, rawHours: 8 }), // Unshipped
    ];
    
    const result = calculateProgressMetrics(projects);
    assert.equal(result.viralHours, 15);
    assert.equal(result.shippedHours, 12);
    assert.equal(result.otherHours, 18); // 10 + 8
    assert.equal(result.totalHours, 45);
    assert.equal(result.totalPercentage, 75); // 45/60 * 100 = 75%
    assert.equal(result.rawHours, 45);
  });

  test('should handle projects with hackatimeLinks (capped at 15 for island)', () => {
    const projects = [
      createMockProject({
        shipped: true,
        rawHours: 100, // Should be ignored
        hackatimeLinks: [
          { rawHours: 10, hoursOverride: 15 }, // 15 approved hours
          { rawHours: 5, hoursOverride: 5 }     // 5 approved hours
        ]
      })
    ];
    
    const result = calculateProgressMetrics(projects);
    
    // Project has 20 total approved hours from hackatimeLinks, but capped at 15 for island calculation
    assert.equal(result.shippedHours, 15); // Capped for island calculation
    assert.equal(result.rawHours, 20); // Raw calculation uses hackatimeLinks total (10+5=15), but we're getting approved hours (15+5=20)
    
    // Clamshells: 5 excess approved hours beyond 15 (20 approved - 15 = 5)
    const phi = (1 + Math.sqrt(5)) / 2;
    const expectedCurrency = Math.floor(5 * (phi * 10));
    assert.equal(result.currency, expectedCurrency);
  });

  test('should handle complex clamshell calculation with multiple project types', () => {
    const phi = (1 + Math.sqrt(5)) / 2;
    
    const projects = [
      // Top 4 projects
      createMockProject({ 
        projectID: '1', 
        shipped: true, 
        viral: false, 
        rawHours: 20,
        hackatimeLinks: [{ rawHours: 20, hoursOverride: 20 }] // 20 approved hours, 5 excess
      }),
      createMockProject({ 
        projectID: '2', 
        shipped: true, 
        viral: true, 
        rawHours: 18,
        hackatimeLinks: [{ rawHours: 18, hoursOverride: 18 }] // 18 approved hours, 3 excess
      }),
      createMockProject({ 
        projectID: '3', 
        shipped: true, 
        viral: false, 
        rawHours: 16,
        hackatimeLinks: [{ rawHours: 16, hoursOverride: 16 }] // 16 approved hours, 1 excess
      }),
      createMockProject({ 
        projectID: '4', 
        shipped: false, 
        viral: false, 
        rawHours: 14,
        hackatimeLinks: [{ rawHours: 14, hoursOverride: 14 }] // Unshipped - no clamshells
      }),
      
      // Non-top-4 projects
      createMockProject({ 
        projectID: '5', 
        shipped: true, 
        viral: false, 
        rawHours: 10,
        hackatimeLinks: [{ rawHours: 10, hoursOverride: 10 }] // All 10 approved hours become clamshells
      }),
      createMockProject({ 
        projectID: '6', 
        shipped: false, 
        viral: false, 
        rawHours: 8,
        hackatimeLinks: [{ rawHours: 8, hoursOverride: 8 }] // Unshipped - no clamshells
      }),
    ];
    
    const result = calculateProgressMetrics(projects);
    
    // Fixed behavior: all shipped projects with approved hours generate clamshells (including viral)
    // Expected clamshells:
    // - Project 1 (top 4, non-viral): (20-15) * phi * 10 = 5 * phi * 10
    // - Project 2 (top 4, viral): (18-15) * phi * 10 = 3 * phi * 10
    // - Project 3 (top 4, non-viral): (16-15) * phi * 10 = 1 * phi * 10
    // - Project 4 (top 4, unshipped): 0 (unshipped projects don't generate clamshells)
    // - Project 5 (non-top-4, shipped, non-viral): 10 * phi * 10
    // - Project 6 (non-top-4, unshipped): 0
    // Total: (5 + 3 + 1 + 10) * phi * 10 = 19 * phi * 10
    const expectedCurrency = Math.floor(19 * (phi * 10));
    assert.equal(result.currency, expectedCurrency);
  });

  test('should handle edge case of exactly 15 hours (no excess)', () => {
    const projects = [
      createMockProject({ 
        shipped: true, 
        rawHours: 15,
        hackatimeLinks: [{ rawHours: 15, hoursOverride: 15 }]
      }),
    ];
    
    const result = calculateProgressMetrics(projects);
    assert.equal(result.shippedHours, 15);
    assert.equal(result.currency, 0); // No excess hours
  });

  test('should handle projects with 0 hours', () => {
    const projects = [
      createMockProject({ shipped: true, rawHours: 0 }),
      createMockProject({ viral: true, rawHours: 0 }),
      createMockProject({ shipped: false, rawHours: 0 }),
    ];
    
    const result = calculateProgressMetrics(projects);
    assert.equal(result.shippedHours, 0);
    assert.equal(result.viralHours, 0);
    assert.equal(result.otherHours, 0);
    assert.equal(result.totalHours, 0);
    assert.equal(result.totalPercentage, 0);
    assert.equal(result.rawHours, 0);
    assert.equal(result.currency, 0);
  });

  test('should prioritize viral over shipped when both are true', () => {
    const projects = [
      // Project that is BOTH shipped and viral with approved hours - should count as viral
      createMockProject({ 
        projectID: '1',
        shipped: true, 
        viral: true, 
        rawHours: 12,
        hackatimeLinks: [{ rawHours: 12, hoursOverride: 12 }] // Has approved hours
      }),
      // Project that is only shipped with approved hours
      createMockProject({ 
        projectID: '2',
        shipped: true, 
        viral: false, 
        rawHours: 8,
        hackatimeLinks: [{ rawHours: 8, hoursOverride: 8 }] // Has approved hours
      }),
    ];
    
    const result = calculateProgressMetrics(projects);
    assert.equal(result.viralHours, 12, 'Shipped+viral project should count as viral hours');
    assert.equal(result.shippedHours, 8, 'Shipped-only project should count as shipped hours');
    assert.equal(result.otherHours, 0, 'No other hours expected');
    assert.equal(result.totalHours, 20, 'Total should be viral + shipped = 12 + 8');
  });
});

// Run the tests if this file is executed directly
if (require.main === module) {
  console.log('Running progress calculation tests...');
} 