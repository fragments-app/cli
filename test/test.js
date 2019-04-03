import React from 'react';

const Test = (props) => {
    const { bgColor, name } = props;
    <div style={{backgroundColor: bgColor }}>
        name: {props.name}
    </div>
}

export default Test;