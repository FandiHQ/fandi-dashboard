import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { eventSaveErrorKey, isEventValidationCode } from '../event-save-error.ts';

describe('eventSaveErrorKey', () => {
    test('typed API codes get their own copy', () => {
        assert.equal(eventSaveErrorKey({ code: 'LINEUP_ENTRY_IN_USE', status: 400 }), 'lineupInUse');
        assert.equal(eventSaveErrorKey({ code: 'EVENT_END_BEFORE_START', status: 400 }), 'validation.EVENT_END_BEFORE_START');
        assert.equal(eventSaveErrorKey({ code: 'CONTEST_BANK_INCOMPLETE', status: 400 }), 'validation.CONTEST_BANK_INCOMPLETE');
    });

    test('everything else is mapped by kind, never the raw API message', () => {
        assert.equal(eventSaveErrorKey({ code: 'NETWORK_ERROR', status: 0, message: 'timeout of 15000ms exceeded' }), 'form.networkError');
        assert.equal(eventSaveErrorKey({ code: 'ERROR', status: 403, message: 'Forbidden resource' }), 'form.noPermission');
        assert.equal(eventSaveErrorKey({ code: 'ERROR', status: 400, message: 'name must be shorter' }), 'form.saveError');
        assert.equal(eventSaveErrorKey({ code: 'SOMETHING_NEW', status: 400 }), 'form.saveError');
        assert.equal(eventSaveErrorKey(new Error('boom')), 'form.saveError');
    });
});

describe('isEventValidationCode', () => {
    test('recognises the form-level codes only', () => {
        assert.equal(isEventValidationCode('FANDI_WINDOW_INVALID'), true);
        assert.equal(isEventValidationCode('Este campo es obligatorio'), false);
        assert.equal(isEventValidationCode(undefined), false);
    });
});
