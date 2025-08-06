import React from 'react';

const NalaKuLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        {/* Pink rounded square background */}
        <rect width="100" height="100" rx="16" ry="16" fill="#ec4899" />

        {/* White Letter 'C' */}
        <path
            d="M68.4,76.4c-9.5,5.1-20.9,5.5-30.8,1.2C27,73,19.3,64.8,17.4,54.8c-2-10.4,0.4-21.3,7-29.3 c9-10.9,24.6-13.3,37.3-6.4c2,1.1,3,3.6,2,5.6c-1,2-3.6,3-5.6,2c-8.9-4.9-20.3-3-27.4,4.2c-5.1,5.2-7,12.7-5.3,19.9 c1.7,7,6.8,12.7,13.6,15.1c9.4,3.3,19.6,0.3,26-6.8c1.7-1.8,4.5-2,6.4-0.2C78.4,70,78.2,74.5,68.4,76.4z"
            fill="white"
        />
    </svg>
);

export default NalaKuLogo;