define([
    'utils/constants'
], function (constants) {

    describe('constants', function() {

        it('should include repo as a string', function() {
            expect(typeof constants.repo).to.equal('string');
        });

        it('should have a dvr seek limit', function() {
            expect(constants.dvrSeekLimit).to.equal(-25);
        });
    });
});
