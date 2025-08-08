import React from 'react';

const DeliveredIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a2 2 0 0 0-2-2H2Z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a2 2 0 0 1 2-2h8Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default DeliveredIcon;
