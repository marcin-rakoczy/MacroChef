// React 18 external-store hook for Dexie liveQuery observables
window.MacroChef = window.MacroChef || {};

(function () {
  const createExternalStore = (observable, initialData) => {
    let snapshot = { data: initialData, loading: true, error: null };
    let subscription = null;
    const listeners = new Set();

    const notify = () => {
      listeners.forEach((listener) => listener());
    };

    return {
      getSnapshot() {
        return snapshot;
      },

      subscribe(listener) {
        listeners.add(listener);
        if (!subscription) {
          try {
            subscription = observable.subscribe({
              next(data) {
                snapshot = { data, loading: false, error: null };
                notify();
              },
              error(error) {
                snapshot = { ...snapshot, loading: false, error };
                notify();
              }
            });
          } catch (error) {
            snapshot = { ...snapshot, loading: false, error };
            notify();
          }
        }

        return () => {
          listeners.delete(listener);
          if (listeners.size === 0 && subscription) {
            subscription.unsubscribe();
            subscription = null;
          }
        };
      }
    };
  };

  const useRepositoryQuery = (createObservable, dependencies, initialData) => {
    const observable = React.useMemo(createObservable, dependencies);
    const store = React.useMemo(
      () => createExternalStore(observable, initialData),
      [observable, initialData]
    );
    return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  };

  window.MacroChef.useRepositoryQuery = useRepositoryQuery;
})();
