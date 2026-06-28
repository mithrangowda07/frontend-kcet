import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

export interface TourCallbacks {
  expandMobileFilters: () => void;
  collapseMobileFilters: () => void;
  hasRecommendations: boolean;
  onCompleteOrSkip: () => void;
}

const getVisibleElement = (selector: string): Element | string => {
  const elements = document.querySelectorAll(selector);
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    const rect = el.getBoundingClientRect();
    // A heuristic for visibility. 
    // If we are on mobile, desktop elements are display: none, so rect.width/height is 0.
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return selector; // Fallback
};

// We use a function for the `element` property so Driver evaluates it lazily right before highlighting!
const createStep = (selector: string, title: string, description: string): DriveStep => ({
  element: () => {
    const visibleEl = getVisibleElement(selector);
    if (typeof visibleEl === 'string') {
      return document.querySelector(visibleEl) as Element;
    }
    return visibleEl;
  },
  popover: {
    title,
    description,
  }
});

export const startRecommendationsTour = (callbacks: TourCallbacks) => {
  // Always expand mobile filters first so they can be measured properly
  callbacks.expandMobileFilters();

  setTimeout(() => {
    const baseSteps: DriveStep[] = [
      {
        popover: {
          title: 'Welcome',
          description: "This page helps you find colleges and branches matching your KCET rank using previous years' cutoff data. You can filter results and save preferred options to your Personal Choice List.",
        }
      },
      createStep('[data-tour="kcet-rank"]', 'KCET Rank', 'Your recommendations depend on the rank shown here. It must be set on your Profile.'),
      createStep('[data-tour="filter-category"]', 'Category', 'Choose your reservation category (e.g. GM, 2A). This affects which cutoff is used.'),
      createStep('[data-tour="filter-year"]', 'Year', 'Pick the cutoff year: 2022–2025. Older years help you see trends.'),
      createStep('[data-tour="filter-round"]', 'Round', 'Select counselling round: R1, R2, or R3. Cutoffs usually change each round.'),
      createStep('[data-tour="filter-cluster"]', 'Branch Cluster', 'Filter by branch type (CSE, Mechanical, etc.). Default is All Clusters. You can select multiple.'),
      createStep('[data-tour="filter-location"]', 'Location', 'Filter by city or area. Use the search box inside the dropdown to find a place quickly.'),
      createStep('[data-tour="filter-opening-rank"]', 'Opening Rank', 'Lowest cutoff rank to include. The app suggests a starting value based on your rank.'),
      createStep('[data-tour="filter-closing-rank"]', 'Closing Rank', 'Highest cutoff rank to include. Must be greater than Opening Rank. Widen this if you see too few results.'),
      createStep('[data-tour="refresh-results"]', 'Apply / Refresh', 'After changing filters, click Refresh (desktop) or Apply Filters (mobile) to update the list. On mobile, Reset restores default filters.')
    ];

    const resultSteps: DriveStep[] = callbacks.hasRecommendations ? [
      createStep('[data-tour="results-list"]', 'Results area', 'Colleges matching your filters appear here. Each row shows college, branch, and cutoff for the year and round you selected.'),
      createStep('[data-tour="result-college-link"]', 'College name link', 'Click the college name to open full college details.'),
      createStep('[data-tour="result-branch-link"]', 'Branch name link', 'Click the branch name to see branch details and historical cutoffs.'),
      createStep('[data-tour="result-cutoff"]', 'Cutoff', 'This is the closing rank for your selected year and round. Compare it with your KCET rank to judge chances.'),
      createStep('[data-tour="result-checkbox"]', 'Row checkbox', 'Tick colleges you want to save. Use the header checkbox to select all unadded rows.'),
      createStep('[data-tour="add-single-choice"]', 'Add to choices (single)', 'Add one college–branch to your list. Items already saved show Added.'),
      createStep('[data-tour="add-selected"]', 'Add Selected', 'Add only the colleges you checked.'),
      createStep('[data-tour="add-all"]', 'Add All', 'Add every visible college that isn’t already in your list. A confirmation popup will appear.')
    ] : [
      {
        popover: {
          title: 'Recommendations',
          description: 'No recommendations found right now. When results appear, you can view details and add them to your choices using the result table.',
        }
      }
    ];

    const finalSteps: DriveStep[] = [
      {
        popover: {
          title: 'Dashboard reminder',
          description: 'Your saved choices appear on the Dashboard under My Personal List, where you can reorder and export them.',
        }
      },
      {
        popover: {
          title: 'Disclaimer',
          description: "These are guides based on past cutoffs, not guarantees. Always verify on the official KCET counselling portal before final option entry.",
        }
      }
    ];

    const allSteps = [...baseSteps, ...resultSteps, ...finalSteps];

    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      steps: allSteps,
      onDestroyStarted: () => {
        callbacks.collapseMobileFilters();
        callbacks.onCompleteOrSkip();
        if (d.hasNextStep() || !d.hasNextStep()) {
          d.destroy();
        }
      }
    });

    d.drive();
  }, 350); // Timeout allows the CSS transition to reveal the mobile filters so height > 0
};
