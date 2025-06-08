function getToken(name: string = "VITE_MAPBOX_ACCESS_TOKEN") {
    const token = import.meta.env[name];
    if (!token) {
        alert(`环境变量 ${name} 未设置`);
        throw new Error(`环境变量 ${name} 未设置`);
    }
    return token;
}

export { getToken };