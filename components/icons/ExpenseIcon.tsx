import React from 'react';

const ExpenseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
    <path d="m7 16-2-2"/>
    <path d="m13 16-2-2"/>
    <path d="m19 10-2 2"/>
    <path d="m13 10-2 2"/>
    <path d="m7 10 2 2"/>
    <path d="m19 16 2-2"/>
  </svg>
);

export default ExpenseIcon;
