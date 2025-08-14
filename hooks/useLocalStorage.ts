import { useState } from 'react';

// This hook allows you to use localStorage with the same interface as useState.
// It persists the state to localStorage, so it's preserved across browser refreshes.
function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, (value: T | ((val: T) => T)) => void] {
    // State to store our value.
    // Pass a function to useState so the logic is only executed once on initial render.
    const [storedValue, setStoredValue] = useState<T>(() => {
        // Prevent execution on server-side rendering
        if (typeof window === 'undefined') {
            return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
        }

        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        } catch (error) {
            // If there's an error, log it and return initialValue
            console.error(`Error reading localStorage key “${key}”:`, error);
            return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function, just like with useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            // Save state
            setStoredValue(valueToStore);
            // Save to local storage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    };

    return [storedValue, setValue];
}

export default useLocalStorage;
