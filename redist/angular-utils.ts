export class AngularUtils {
    /**
     * Translate from React "componentDidUpdate" arguments to Angular "ngOnChanges" arguments
     * @param _this
     * @param prevProps 
     * @param prevState 
     */
    static callNgOnChanges(_this, prevProps, prevState) {
        let keys = Object.keys(prevProps);
        let changes = {}
        for (let key of keys) {
            if (_this.props[key]!=prevProps[key]) {
                changes[key] = {
                    currentValue: _this.props[key]
                }
            }
        }
        _this.ngOnChanges(changes);
    }
}