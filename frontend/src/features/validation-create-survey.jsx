export const validationCreateSurvey = (errors) => {
    if (!errors || errors.length === 0) {
        return null;
    }
    return (
        <div className="error-container">
            {errors.map((error, index) => (
                <div key={index} className="error-message">
                    {error.errorMessage}
                </div>
            ))}
        </div>
    );
};