# Async loader javascript/css (json/html/ejs/...)

#EN
...

#RU

Асинхронный кроссдоменный загрузчик статических ресурсов. Позволяет подгружать зависимости, управлять имеющимися зависимостяси и вызывать функции обратного вызова в момент загрузки зависимости(ей). Что позволяет сократить время загрузки страницы и ускорить GUI сайта, сократив время загрузки страницы и время на разбор и применение неиспользуемых частей js и css.


[1. Иницилизация загрузчика](#init)  
[2. Загрузка скрипта](#load)  
[3. Загрузка зависимостей](#loads)  
[4. События](#events)  
[5. Установка](#install)  

## Загрузка скриптов

<a name="init" />
##### Иницилизаци загрузчика
Загрузчик добавляет метод в глобальное пространтсво имен window.Loader предоставляя функцию конструктор, которая будет возвращать объект загрузчика.
Конструктор может принять объект с параметрами:

    moduleDir [""] - путь для поиска относительных модулей
    addFromPage [true] - добавляет в момент иницилизации зпгрузчика все, имеющиеся на странице, js и css в загрузчик

##### Пример иницилизации загрузчика

```javascript
    var Loader = new Loader({
        'moduleDir': '/modules',
        'addFromPage': false
    });
```
    
В большинстве случаев достаточно всего 1 загрузчика для всех типов данных, поэтому можно перезатереть констурктор window.Loader экзкмпляром загрузчика, чтобы не создать еще одну копию загрузчика. Функция конструтокр реализована по патерну "модуль", предоставляя наружу только необходимое api, скрывая в себе сложность реализации.

<a name="load" />
##### Пример загрузки одиночного скрипта:

```javascript
    Loader.load({String}name, {Object}[params], {Function}[callback]); 
    
    // загрузка по относительному пути
    Loader.load('bootstrap.js'); 
    Loader.load('bootstrap.css'); 
    
    // кросдоменная загрузка
    Loader.load('bootstrap.js', {
        url: 'http://yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'
    }); 
    
    //кросдоменная загрузка по полному пути
    Loader.load('http://yandex.st/bootstrap/3.1.1/js/bootstrap.min.js');
```

Параметр ***params*** полностью поддерживает все опции пердоставляемые jQuery.ajax(***params***) [http://stage.api.jquery.com/jQuery.ajax/];
Поэтому можно повесить дополнительынй callback на любое состояние запроса и использовать почти все возможности ajax.

##### Вызов callback после загрузки скрипта

```javascript
    Loader.load('bootstrap.js', function(){
        alert('bootstrap is ready!');
    }); 
```
    
##### Тонкое управление (сложный уровень, не рекомендуется для использования)
    
```javascript
    Loader.load('bootstrap.js', {
        success: function(data, textStatus, jqXHR ){
            console.log('seccond  success callback');
        },
        complete: function(jqXHR, textStatus ){
            console.log('complete callback');
        },
        statusCode: {
            201: function(){
                console.log('last collback  (status=201)');
            }
        }
    }, function(){
        console.log('first success callback');
    });
```

<a name="loads" />
##### Пимер загрузки нескольких зависимостей:

```javascript
    Loader.loads({Array}modules, {Function}[callback]);

    var dojoModule = {
        name: 'dojo',
        params: {
            url: 'http://yandex.st/dojo/1.9.1/dojo/dojo.js'
        }
    };
    Loader.loads([
        'bootstrap.js', 
        'bootstrap.css', 
        'http://yandex.st/d3/3.4.5/d3.js', 
        dojoModule
        ], 
        function(){
            console.log('after load all callback');
    });
```

Я так и не смог однозначно определиться с тербованиями для автоматической подгрузки зависимостей из-за специфики архитектуры проекта, поэтому предоставил всего лишь 1 метод loads, который скорее всего пригодится при реализации автоматической подгрузки зависимостей в рамках той или иной архитектуры проекта.

<a name="events" />
##### События
Загрузчик выкидывает на элементе *document* событие ***Loader.load***, передавая в обработчик 3 параметра [name, extension, url]

```javascript
    $(document).on('Loader.load', function(event, name, extension, url){
        ...
    });
```

<a name="install" />
##### Установка

С помощью bower

    bower install js-loader
    
Или скачав файл https://github.com/alexpts/js-loader/blob/master/src/loader.js