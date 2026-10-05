import api from './api';
import type {
    FanbaseAlsoFollows,
    FanbaseGeography,
    FanbaseKnowledge,
    FanbaseOverview,
    FanbaseValue,
} from './fanbase';

/**
 * Fanbase routes (fandi-api RFC §8). The org is always the caller's own,
 * resolved by the API from the membership; nothing here takes an org id.
 */
const get = <T>(path: string): Promise<T> => api.get<T>(path).then((res) => res.data);

export const fanbaseApi = {
    overview: () => get<FanbaseOverview>('/dashboard/fanbase/overview'),
    geography: () => get<FanbaseGeography>('/dashboard/fanbase/geography'),
    value: () => get<FanbaseValue>('/dashboard/fanbase/value'),
    alsoFollows: () => get<FanbaseAlsoFollows>('/dashboard/fanbase/also-follows'),
    knowledge: () => get<FanbaseKnowledge>('/dashboard/fanbase/knowledge'),
};
