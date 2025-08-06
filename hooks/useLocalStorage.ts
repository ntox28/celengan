import { useState } from 'react';

function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue instanceof Function ? initialValue() : initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                return JSON.parse(item);
            }
            // If no item, compute the initial value and store it
            const finalInitialValue = initialValue instanceof Function ? initialValue() : initialValue;
            window.localStorage.setItem(key, JSON.stringify(finalInitialValue));
            return finalInitialValue;
        } catch (error) {
            console.error(error);
            return initialValue instanceof Function ? initialValue() : initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            // Allow value to be a function so we have same API as useState
            setStoredValue(currentStoredValue => {
                const valueToStore = value instanceof Function ? value(currentStoredValue) : value;
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
                return valueToStore;
            });
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

export default useLocalStorage;