
# Description

This project is an automatic translator from a simple Angular application into a React application.

This is still a working progress project.

# Dependencies

- npm and node
- angular (to run the tests applications)
- react (to run the output applications)

# Run the project

Running the project translates the angular application located at ```angular/projects/test1```.

```
npm install
npm start
```

# DONE
- Templates with basic HTML (tags)
- Templates with basic HTML (text attributes)
- Interpolation 
  - simple property access
  - recursive property access
- Property binding
- Conditionals & loops

# TODO
- Lazy modules component dependency
- Templates with basic HTML (attributes with interpolation)
- Routing
- Reactivity 😥
- ...

# Angular requirements

- Absence of inline styling

# Caveats
- Added "strictPropertyInitialization": false to react tsconfig.json
- Added "strict": false to react tsconfig.json
- Avoid inline styles and objects in html attributes