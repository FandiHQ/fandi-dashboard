'use client';

/**
 * DEV-ONLY: the knowledge-contest authoring and results pieces with local
 * fixtures (no API), for visual review in /dev-gallery.
 */
import { useState } from 'react';
import { QuestionBankEditor } from '@/components/contest/QuestionBankEditor';
import { CategoryResult } from '@/components/contest/ContestResultsSection';
import type { BankQuestionDraft } from '@/lib/contest-bank';

const SAMPLE: BankQuestionDraft[] = [
    {
        id: 'q1',
        prompt: '¿En qué ciudad grabó Yalí el video de su primer sencillo?',
        options: ['Cartagena', 'Medellín', 'Bogotá', 'Cali'],
        correctIndex: 0,
    },
    {
        id: 'q2',
        prompt: '¿Cómo se llama su primer álbum?',
        options: ['Raíz', 'Brisa', 'Brisa', ''],
        correctIndex: -1,
    },
];

export function ContestShowcase() {
    // A fixed key (not emptyQuestion()'s random one) so SSR and hydration agree.
    const [bank, setBank] = useState<BankQuestionDraft[]>([
        ...SAMPLE,
        { clientKey: 'sample-new', prompt: '', options: ['', '', '', ''], correctIndex: -1 },
    ]);
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="contest-showcase">
            <div className="block-white p-5 text-ink">
                <QuestionBankEditor questions={bank} onChange={setBank} locked={false} />
            </div>
            <div className="flex flex-col gap-6">
                <div className="block-white p-5 text-ink">
                    <QuestionBankEditor questions={SAMPLE.slice(0, 1)} onChange={() => {}} locked />
                </div>
                <div className="block-white p-5 text-ink">
                    <CategoryResult
                        name="VIP"
                        category={{
                            level: 4,
                            name: 'VIP',
                            participants: 12,
                            eligible: 4,
                            vacancies: 1,
                            winners: [
                                {
                                    position: 1,
                                    userId: 'u1',
                                    displayName: 'Laura M.',
                                    responseMs: 1500,
                                    firstContributionAt: '2026-09-29T20:01:12.000Z',
                                },
                                {
                                    position: 2,
                                    userId: 'u2',
                                    displayName: 'Andrés P.',
                                    responseMs: 2400,
                                    firstContributionAt: '2026-09-29T20:03:40.000Z',
                                },
                            ],
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
