import type { AgeBracket, BiologicalSex } from '../types';

interface Props {
  sex: BiologicalSex;
  ageBracket: AgeBracket;
  onChange: (sex: BiologicalSex, age: AgeBracket) => void;
}

const AGE_BRACKETS: AgeBracket[] = ['20-30', '31-40', '41-50', '51-60', '61+'];

export function DemographicsSelector({ sex, ageBracket, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Sex toggle */}
      <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
        {(['male', 'female'] as BiologicalSex[]).map((s) => (
          <button
            key={s}
            onClick={() => onChange(s, ageBracket)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors capitalize ${
              sex === s
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Age bracket */}
      <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
        {AGE_BRACKETS.map((age) => (
          <button
            key={age}
            onClick={() => onChange(sex, age)}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              ageBracket === age
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {age}
          </button>
        ))}
      </div>
    </div>
  );
}
