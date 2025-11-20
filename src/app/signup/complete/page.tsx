// src/app/signup/complete/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';

const countryOptions = [
	{ value: 'Afghanistan', label: 'Afghanistan' },
	{ value: 'Albania', label: 'Albania' },
	{ value: 'Algeria', label: 'Algeria' },
	{ value: 'Andorra', label: 'Andorra' },
	{ value: 'Angola', label: 'Angola' },
	{ value: 'Antigua and Barbuda', label: 'Antigua and Barbuda' },
	{ value: 'Argentina', label: 'Argentina' },
	{ value: 'Armenia', label: 'Armenia' },
	{ value: 'Australia', label: 'Australia' },
	{ value: 'Austria', label: 'Austria' },
	{ value: 'Azerbaijan', label: 'Azerbaijan' },
	{ value: 'Bahamas', label: 'Bahamas' },
	{ value: 'Bahrain', label: 'Bahrain' },
	{ value: 'Bangladesh', label: 'Bangladesh' },
	{ value: 'Barbados', label: 'Barbados' },
	{ value: 'Belarus', label: 'Belarus' },
	{ value: 'Belgium', label: 'Belgium' },
	{ value: 'Belize', label: 'Belize' },
	{ value: 'Benin', label: 'Benin' },
	{ value: 'Bhutan', label: 'Bhutan' },
	{ value: 'Bolivia', label: 'Bolivia' },
	{ value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
	{ value: 'Botswana', label: 'Botswana' },
	{ value: 'Brazil', label: 'Brazil' },
	{ value: 'Brunei', label: 'Brunei' },
	{ value: 'Bulgaria', label: 'Bulgaria' },
	{ value: 'Burkina Faso', label: 'Burkina Faso' },
	{ value: 'Burundi', label: 'Burundi' },
	{ value: 'Cabo Verde', label: 'Cabo Verde' },
	{ value: 'Cambodia', label: 'Cambodia' },
	{ value: 'Cameroon', label: 'Cameroon' },
	{ value: 'Canada', label: 'Canada' },
	{ value: 'Central African Republic', label: 'Central African Republic' },
	{ value: 'Chad', label: 'Chad' },
	{ value: 'Chile', label: 'Chile' },
	{ value: 'China', label: 'China' },
	{ value: 'Colombia', label: 'Colombia' },
	{ value: 'Comoros', label: 'Comoros' },
	{ value: 'Congo', label: 'Congo' },
	{ value: 'Costa Rica', label: 'Costa Rica' },
	{ value: 'Croatia', label: 'Croatia' },
	{ value: 'Cuba', label: 'Cuba' },
	{ value: 'Cyprus', label: 'Cyprus' },
	{ value: 'Czechia', label: 'Czechia' },
	{ value: 'Denmark', label: 'Denmark' },
	{ value: 'Djibouti', label: 'Djibouti' },
	{ value: 'Dominica', label: 'Dominica' },
	{ value: 'Dominican Republic', label: 'Dominican Republic' },
	{ value: 'Ecuador', label: 'Ecuador' },
	{ value: 'Egypt', label: 'Egypt' },
	{ value: 'El Salvador', label: 'El Salvador' },
	{ value: 'Equatorial Guinea', label: 'Equatorial Guinea' },
	{ value: 'Eritrea', label: 'Eritrea' },
	{ value: 'Estonia', label: 'Estonia' },
	{ value: 'Eswatini', label: 'Eswatini' },
	{ value: 'Ethiopia', label: 'Ethiopia' },
	{ value: 'Fiji', label: 'Fiji' },
	{ value: 'Finland', label: 'Finland' },
	{ value: 'France', label: 'France' },
	{ value: 'Gabon', label: 'Gabon' },
	{ value: 'Gambia', label: 'Gambia' },
	{ value: 'Georgia', label: 'Georgia' },
	{ value: 'Germany', label: 'Germany' },
	{ value: 'Ghana', label: 'Ghana' },
	{ value: 'Greece', label: 'Greece' },
	{ value: 'Grenada', label: 'Grenada' },
	{ value: 'Guatemala', label: 'Guatemala' },
	{ value: 'Guinea', label: 'Guinea' },
	{ value: 'Guinea-Bissau', label: 'Guinea-Bissau' },
	{ value: 'Guyana', label: 'Guyana' },
	{ value: 'Haiti', label: 'Haiti' },
	{ value: 'Honduras', label: 'Honduras' },
	{ value: 'Hungary', label: 'Hungary' },
	{ value: 'Iceland', label: 'Iceland' },
	{ value: 'India', label: 'India' },
	{ value: 'Indonesia', label: 'Indonesia' },
	{ value: 'Iran', label: 'Iran' },
	{ value: 'Iraq', label: 'Iraq' },
	{ value: 'Ireland', label: 'Ireland' },
	{ value: 'Israel', label: 'Israel' },
	{ value: 'Italy', label: 'Italy' },
	{ value: 'Jamaica', label: 'Jamaica' },
	{ value: 'Japan', label: 'Japan' },
	{ value: 'Jordan', label: 'Jordan' },
	{ value: 'Kazakhstan', label: 'Kazakhstan' },
	{ value: 'Kenya', label: 'Kenya' },
	{ value: 'Kiribati', label: 'Kiribati' },
	{ value: 'Kuwait', label: 'Kuwait' },
	{ value: 'Kyrgyzstan', label: 'Kyrgyzstan' },
	{ value: 'Laos', label: 'Laos' },
	{ value: 'Latvia', label: 'Latvia' },
	{ value: 'Lebanon', label: 'Lebanon' },
	{ value: 'Lesotho', label: 'Lesotho' },
	{ value: 'Liberia', label: 'Liberia' },
	{ value: 'Libya', label: 'Libya' },
	{ value: 'Liechtenstein', label: 'Liechtenstein' },
	{ value: 'Lithuania', label: 'Lithuania' },
	{ value: 'Luxembourg', label: 'Luxembourg' },
	{ value: 'Madagascar', label: 'Madagascar' },
	{ value: 'Malawi', label: 'Malawi' },
	{ value: 'Malaysia', label: 'Malaysia' },
	{ value: 'Maldives', label: 'Maldives' },
	{ value: 'Mali', label: 'Mali' },
	{ value: 'Malta', label: 'Malta' },
	{ value: 'Marshall Islands', label: 'Marshall Islands' },
	{ value: 'Mauritania', label: 'Mauritania' },
	{ value: 'Mauritius', label: 'Mauritius' },
	{ value: 'Mexico', label: 'Mexico' },
	{ value: 'Micronesia', label: 'Micronesia' },
	{ value: 'Moldova', label: 'Moldova' },
	{ value: 'Monaco', label: 'Monaco' },
	{ value: 'Mongolia', label: 'Mongolia' },
	{ value: 'Montenegro', label: 'Montenegro' },
	{ value: 'Morocco', label: 'Morocco' },
	{ value: 'Mozambique', label: 'Mozambique' },
	{ value: 'Myanmar', label: 'Myanmar' },
	{ value: 'Namibia', label: 'Namibia' },
	{ value: 'Nauru', label: 'Nauru' },
	{ value: 'Nepal', label: 'Nepal' },
	{ value: 'Netherlands', label: 'Netherlands' },
	{ value: 'New Zealand', label: 'New Zealand' },
	{ value: 'Nicaragua', label: 'Nicaragua' },
	{ value: 'Niger', label: 'Niger' },
	{ value: 'Nigeria', label: 'Nigeria' },
	{ value: 'North Korea', label: 'North Korea' },
	{ value: 'North Macedonia', label: 'North Macedonia' },
	{ value: 'Norway', label: 'Norway' },
	{ value: 'Oman', label: 'Oman' },
	{ value: 'Pakistan', label: 'Pakistan' },
	{ value: 'Palau', label: 'Palau' },
	{ value: 'Palestine', label: 'Palestine' },
	{ value: 'Panama', label: 'Panama' },
	{ value: 'Papua New Guinea', label: 'Papua New Guinea' },
	{ value: 'Paraguay', label: 'Paraguay' },
	{ value: 'Peru', label: 'Peru' },
	{ value: 'Philippines', label: 'Philippines' },
	{ value: 'Poland', label: 'Poland' },
	{ value: 'Portugal', label: 'Portugal' },
	{ value: 'Qatar', label: 'Qatar' },
	{ value: 'Romania', label: 'Romania' },
	{ value: 'Russia', label: 'Russia' },
	{ value: 'Rwanda', label: 'Rwanda' },
	{ value: 'Saint Kitts and Nevis', label: 'Saint Kitts and Nevis' },
	{ value: 'Saint Lucia', label: 'Saint Lucia' },
	{ value: 'Saint Vincent and the Grenadines', label: 'Saint Vincent and the Grenadines' },
	{ value: 'Samoa', label: 'Samoa' },
	{ value: 'San Marino', label: 'San Marino' },
	{ value: 'Sao Tome and Principe', label: 'Sao Tome and Principe' },
	{ value: 'Saudi Arabia', label: 'Saudi Arabia' },
	{ value: 'Senegal', label: 'Senegal' },
	{ value: 'Serbia', label: 'Serbia' },
	{ value: 'Seychelles', label: 'Seychelles' },
	{ value: 'Sierra Leone', label: 'Sierra Leone' },
	{ value: 'Singapore', label: 'Singapore' },
	{ value: 'Slovakia', label: 'Slovakia' },
	{ value: 'Slovenia', label: 'Slovenia' },
	{ value: 'Solomon Islands', label: 'Solomon Islands' },
	{ value: 'Somalia', label: 'Somalia' },
	{ value: 'South Africa', label: 'South Africa' },
	{ value: 'South Korea', label: 'South Korea' },
	{ value: 'South Sudan', label: 'South Sudan' },
	{ value: 'Spain', label: 'Spain' },
	{ value: 'Sri Lanka', label: 'Sri Lanka' },
	{ value: 'Sudan', label: 'Sudan' },
	{ value: 'Suriname', label: 'Suriname' },
	{ value: 'Sweden', label: 'Sweden' },
	{ value: 'Switzerland', label: 'Switzerland' },
	{ value: 'Syria', label: 'Syria' },
	{ value: 'Taiwan', label: 'Taiwan' },
	{ value: 'Tajikistan', label: 'Tajikistan' },
	{ value: 'Tanzania', label: 'Tanzania' },
	{ value: 'Thailand', label: 'Thailand' },
	{ value: 'Timor-Leste', label: 'Timor-Leste' },
	{ value: 'Togo', label: 'Togo' },
	{ value: 'Tonga', label: 'Tonga' },
	{ value: 'Trinidad and Tobago', label: 'Trinidad and Tobago' },
	{ value: 'Tunisia', label: 'Tunisia' },
	{ value: 'Turkey', label: 'Turkey' },
	{ value: 'Turkmenistan', label: 'Turkmenistan' },
	{ value: 'Tuvalu', label: 'Tuvalu' },
	{ value: 'Uganda', label: 'Uganda' },
	{ value: 'Ukraine', label: 'Ukraine' },
	{ value: 'United Arab Emirates', label: 'United Arab Emirates' },
	{ value: 'United Kingdom', label: 'United Kingdom' },
	{ value: 'United States', label: 'United States' },
	{ value: 'Uruguay', label: 'Uruguay' },
	{ value: 'Uzbekistan', label: 'Uzbekistan' },
	{ value: 'Vanuatu', label: 'Vanuatu' },
	{ value: 'Vatican City', label: 'Vatican City' },
	{ value: 'Venezuela', label: 'Venezuela' },
	{ value: 'Vietnam', label: 'Vietnam' },
	{ value: 'Yemen', label: 'Yemen' },
	{ value: 'Zambia', label: 'Zambia' },
	{ value: 'Zimbabwe', label: 'Zimbabwe' }
];

interface BibleVersion {
    id: string;
    displayName: string;
    language: string;
}

export default function SignupCompletePage() {
	const router = useRouter();
	const [country, setCountry] = useState('');
	const [language, setLanguage] = useState('English (EN)');
	const [version, setVersion] = useState('NKJV');
	const [loading, setLoading] = useState(false);
	const [versionOptions, setVersionOptions] = useState<BibleVersion[]>([]);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const cached = localStorage.getItem('bible_versions');
			if (cached) {
				try {
					const arr = JSON.parse(cached);
					setVersionOptions(arr);
				} catch {}
			}
		}
	}, []);

	const handleCreateNow = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		// TODO: persist profile preferences to your DB if you have an endpoint
		setTimeout(() => {
			setLoading(false);
			window.location.href = '/bible';
		}, 700);
	};

	const handleSkip = () => {
		window.location.href = '/bible';
	};

	const handleBack = (e: React.MouseEvent) => {
		e.preventDefault();
		if (typeof window !== 'undefined' && window.history.length > 1) router.back();
		else router.push('/signup');
	};

	return (
		<div className="min-h-screen flex items-start sm:items-center justify-center bg-[#ffffff] px-4 py-8 sm:py-16">
			<div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border">
				<div className="flex justify-start mb-4">
					<button onClick={handleBack} aria-label="Go back" className="inline-flex items-center text-2xl">
						←
					</button>
				</div>

				<h1 className="text-2xl font-semibold text-left mb-2">Complete your profile</h1>
				<p className="text-left text-sm text-gray-500 mb-4">Help us personalize your Bible reading experience</p>

				<form onSubmit={handleCreateNow} className="space-y-4">
					<div className="text-gray-500 font-normal">
						<label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
						<Select
							options={countryOptions}
							value={countryOptions.find(opt => opt.value === country) || null}
							onChange={opt => setCountry(opt ? opt.value : '')}
							classNamePrefix="react-select"
							placeholder="Select country..."
							isSearchable
							styles ={{ 
								control: (provided) => ({
									...provided,
									minHeight: '48px',
									padding: '0',
									borderRadius: '0.5rem',
									borderColor: '#d1d5db', // Tailwind gray-300
									boxShadow: 'none',
								}),
								input: (provided) => ({
									...provided,
									minHeight: '24px',
								}),
								valueContainer: (provided) => ({
									...provided,
									padding: '0 0.75rem',
								}),
								placeholder: (provided) => ({
									...provided,
									paddingLeft: '0.75rem',
								}),
							}}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2 " >Preferred language</label>
						<select
							value={language}
							onChange={e => setLanguage(e.target.value)}
							className="mt-1 block w-full border rounded-lg p-3"
						>
							<option className="text-gray-500 font-normal">English </option>
							<option className="text-gray-500 font-normal">తెలుగు (Telugu)</option>
							<option className="text-gray-500 font-normal">ಕನ್ನಡ (Kannada)</option>
							<option className="text-gray-500 font-normal">தமிழ் (Tamil)</option>
							<option className="text-gray-500 font-normal">മലയാളം (Malayalam)</option>
							<option className="text-gray-500 font-normal">हिंदी (Hindi)</option>						
						</select>
					</div>

					<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Preferred versions
  </label>

  <select
    value={version}
    onChange={(e) => setVersion(e.target.value)}
    className="mt-1 block w-full border rounded-lg p-3"
  >
    {/* ---- English Group ---- */}
    <optgroup label="English" className="text-gray-500 font-normal">
      {versionOptions
        .filter(v => v.language === "en")
        .sort((a, b) => {
          const order: Record<string, number> = { en: 1, te: 2 };
          return (order[a.language] || 3) - (order[b.language] || 3);
        })
        .map(v => {
          const cleanName = v.displayName.replace(/\s*\([^)]*\)/, "");
          return (
            <option key={v.id} value={v.id}>
              {cleanName.trim()} {v.id.toUpperCase()}
            </option>
          );
        })}
    </optgroup>

    {/* ---- Telugu Group ---- */}
    <optgroup label="Telugu" className="text-gray-500 font-normal">
      {versionOptions
        .filter(v => v.language === "te")
        .sort((a, b) => {
          const order: Record<string, number> = { en: 1, te: 2 };
          return (order[a.language] || 3) - (order[b.language] || 3);
        })
        .map(v => {
          const cleanName = v.displayName.replace(/\s*\([^)]*\)/, "");
          return (
            <option key={v.id} value={v.id}>
              {cleanName.trim()} {v.id.toUpperCase()}
            </option>
          );
        })}
    </optgroup>
  </select>
</div>

					{/* <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Preferred versions
  </label>

  <select
    value={version}
    onChange={(e) => setVersion(e.target.value)}
    className="mt-1 block w-full border rounded-lg p-3"
  >
   
    <optgroup label="𝖤𝗇𝗀𝗅𝗂𝗌𝗁">
      {versionOptions
        .filter(v => v.language === "en")
        .sort((a, b) => {
          const order: Record<string, number> = { en: 1, te: 2 };
          return (order[a.language] || 3) - (order[b.language] || 3);
        })
        .map(v => {
          const cleanName = v.displayName.replace(/\s*\([^)]*\)/, "");
          return (
            <option key={v.id} value={v.id}>
              {cleanName.trim()} {v.id.toUpperCase()}
            </option>
          );
        })}
    </optgroup>

    <optgroup label="𝖳𝖾𝗅𝗎𝗀𝗎">
      {versionOptions
        .filter(v => v.language === "te")
        .sort((a, b) => {
          const order: Record<string, number> = { en: 1, te: 2 };
          return (order[a.language] || 3) - (order[b.language] || 3);
        })
        .map(v => {
          const cleanName = v.displayName.replace(/\s*\([^)]*\)/, "");
          return (
            <option key={v.id} value={v.id}>
              {cleanName.trim()} {v.id.toUpperCase()}
            </option>
          );
        })}
    </optgroup>
  </select>
</div> */}

					{/* <div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Preferred versions</label>
						<select
							value={version}
							onChange={e => setVersion(e.target.value)}
							className="mt-1 block w-full border rounded-lg p-3"
						>
							{versionOptions.sort((a,b)=> {
								const order: Record<string, number> = { en: 1, te: 2 };
								 return (order[a.language] || 3) - (order[b.language] || 3);
							}).map(v => {
									// Remove acronym in parentheses from displayName
									const cleanName = v.displayName.replace(/\s*\([^)]*\)/, '');
									return (
										<option key={v.id} value={v.id}>
											{cleanName.trim()} {v.id.toUpperCase()} - {v.language === 'en' ? 'English' : v.language === 'te' ? 'Telugu' : v.language}
										</option>
									);
								})}
						</select>
					</div> */}

					<button
						disabled={loading}
						type="submit"
						className="w-full py-3 bg-teal-700 text-white rounded-lg"
					>
						{loading ? 'Please wait...' : 'Complete now'}
					</button>

					<button
						type="button"
						onClick={handleSkip}
						className="w-full py-3 mt-2 bg-gray-200 text-gray-700 rounded-lg"
					>
						Skip for now
					</button>
				</form>
			</div>
		</div>
	);
}
