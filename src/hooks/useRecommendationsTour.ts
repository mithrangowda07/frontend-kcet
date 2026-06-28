import { useCallback, useEffect, useRef } from 'react';
import { startRecommendationsTour } from '../tours/recommendationsTour';

interface UseRecommendationsTourProps {
  setIsFiltersCollapsed: (collapsed: boolean) => void;
  hasRecommendations: boolean;
  isInitialLoad: boolean;
}

export const useRecommendationsTour = ({
  setIsFiltersCollapsed,
  hasRecommendations,
  isInitialLoad,
}: UseRecommendationsTourProps) => {
  const hasStartedRef = useRef(false);

  const startTour = useCallback(() => {
    startRecommendationsTour({
      expandMobileFilters: () => {
        setIsFiltersCollapsed(false);
      },
      collapseMobileFilters: () => {
        setIsFiltersCollapsed(true);
      },
      hasRecommendations,
      onCompleteOrSkip: () => {
        localStorage.setItem('recommendations_tour_v1', 'completed');
      }
    });
  }, [setIsFiltersCollapsed, hasRecommendations]);

  useEffect(() => {
    // Auto-start once on first visit, wait until recommendations are loaded initially (or loading finished)
    if (!isInitialLoad && !hasStartedRef.current) {
      const tourStatus = localStorage.getItem('recommendations_tour_v1');
      if (tourStatus !== 'completed') {
        hasStartedRef.current = true;
        // Small delay to ensure the DOM is fully settled
        setTimeout(() => {
          startTour();
        }, 500);
      }
    }
  }, [isInitialLoad, startTour]);

  return { startTour };
};
